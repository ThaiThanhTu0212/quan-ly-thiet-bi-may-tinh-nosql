"""Regression checks for own-account data, customer cancellation and comparison."""
import copy
import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch
from bson import ObjectId
from fastapi import HTTPException
from pydantic import ValidationError
from app.models.user import UserResponse
from app.routers import account, orders, products


def complete(coroutine):
    try: coroutine.send(None)
    except StopIteration as result: return result.value
    raise AssertionError('Unexpected external IO')


class Users:
    def __init__(self, doc): self.doc=doc
    async def find_one(self, query, *args, **kwargs): return copy.deepcopy(self.doc) if query['_id']==self.doc['_id'] else None
    async def update_one(self, query, update, **kwargs):
        if query['_id']!=self.doc['_id']: return SimpleNamespace(matched_count=0)
        for key in ('addresses','default_address_id'):
            if key not in query: continue
            expected=query[key]
            if isinstance(expected,dict) and '$exists' in expected:
                if (key in self.doc)!=expected['$exists']: return SimpleNamespace(matched_count=0)
            elif self.doc.get(key)!=expected: return SimpleNamespace(matched_count=0)
        self.doc.update(copy.deepcopy(update['$set']))
        return SimpleNamespace(matched_count=1)


class AccountTests(unittest.TestCase):
    def setUp(self):
        self.id=ObjectId();self.user=UserResponse(id=str(self.id),username='buyer',email='buyer@example.com')
        self.db=SimpleNamespace(users=Users({'_id':self.id,'username':'buyer','email':'buyer@example.com','role':'customer','password_hash':'hidden','cart':[{'sku':'A','quantity':2}]}))
        self.address=account.AddressWrite(full_name='Buyer',phone='0901234567',street='Street',province='Province',district='District',ward='Ward')
    def test_profile_cannot_set_role_or_email(self):
        for forbidden in ('role','email','password_hash','cart'):
            with self.subTest(field=forbidden),self.assertRaises(ValidationError): account.ProfileWrite(full_name='Buyer',**{forbidden:'admin'})
    def test_profile_updates_only_own_name_and_phone(self):
        with patch.object(account,'get_database',return_value=self.db): result=complete(account.update_profile(account.ProfileWrite(full_name='New Name',phone='0901234567'),self.user))
        self.assertEqual(result['full_name'],'New Name');self.assertNotIn('password_hash',result)
        self.assertEqual(self.db.users.doc['role'],'customer');self.assertEqual(self.db.users.doc['cart'][0]['quantity'],2)
    def test_address_defaults_edit_delete_preserve_cart(self):
        with patch.object(account,'get_database',return_value=self.db),patch.object(account,'validate_address',AsyncMock()):
            first=complete(account.add_address(self.address,self.user));first_id=first['addresses'][0]['id']
            self.assertEqual(first['default_address_id'],first_id)
            second=complete(account.add_address(self.address.model_copy(update={'label':'Office'}),self.user));second_id=second['addresses'][1]['id']
            chosen=complete(account.set_default_address(second_id,self.user));self.assertEqual(chosen['default_address_id'],second_id)
            edited=complete(account.edit_address(second_id,self.address.model_copy(update={'street':'New Street'}),self.user));self.assertEqual(edited['addresses'][1]['street'],'New Street')
            removed=complete(account.delete_address(second_id,self.user));self.assertEqual(removed['default_address_id'],first_id)
            empty=complete(account.delete_address(first_id,self.user));self.assertEqual(empty['addresses'],[]);self.assertIsNone(empty['default_address_id'])
        self.assertEqual(self.db.users.doc['cart'],[{'sku':'A','quantity':2}])
    def test_my_orders_are_scoped_even_for_admin(self):
        seen=[]
        class Cursor:
            def sort(self,*args): return self
            def skip(self,*args): return self
            def limit(self,*args): return self
            async def to_list(self,*args): return []
        def find(query,*args): seen.append(query);return Cursor()
        db=SimpleNamespace(orders=SimpleNamespace(find=find))
        admin_user=self.user.model_copy(update={'role':'admin'})
        with patch.object(account,'get_database',return_value=db): complete(account.get_my_orders(skip=0,limit=10,user=admin_user))
        self.assertEqual(seen[0]['$or'][0],{'user_id':self.user.id})
    def test_unknown_address_cannot_be_default(self):
        with patch.object(account,'get_database',return_value=self.db),self.assertRaises(HTTPException): complete(account.set_default_address('someone-elses-address',self.user))
    def test_address_limit(self):
        self.db.users.doc['addresses']=[{'id':str(i)} for i in range(10)]
        with patch.object(account,'get_database',return_value=self.db),patch.object(account,'validate_address',AsyncMock()),self.assertRaises(HTTPException) as error: complete(account.add_address(self.address,self.user))
        self.assertEqual(error.exception.status_code,422);self.assertEqual(len(self.db.users.doc['addresses']),10)
    def test_concurrent_address_change_is_retried(self):
        original=self.db.users.update_one;calls=[]
        async def update(query,change,**kwargs):
            calls.append(query)
            if len(calls)==1:
                self.db.users.doc['addresses']=[{'id':'external'}];self.db.users.doc['default_address_id']='external'
                return SimpleNamespace(matched_count=0)
            return await original(query,change,**kwargs)
        self.db.users.update_one=update
        with patch.object(account,'get_database',return_value=self.db),patch.object(account,'validate_address',AsyncMock()): result=complete(account.add_address(self.address,self.user))
        self.assertEqual(len(result['addresses']),2);self.assertEqual(result['addresses'][0]['id'],'external');self.assertEqual(len(calls),2)


class CancellationTests(unittest.TestCase):
    def database(self,doc):
        class Session:
            async def __aenter__(self): return self
            async def __aexit__(self,*args): pass
            async def with_transaction(self,callback): return await callback(self)
        return SimpleNamespace(client=SimpleNamespace(start_session=AsyncMock(return_value=Session())),orders=SimpleNamespace(find_one=AsyncMock(return_value=doc),update_one=AsyncMock(return_value=SimpleNamespace(modified_count=1))),products=SimpleNamespace(update_one=AsyncMock()))
    def setUp(self): self.user=UserResponse(id=str(ObjectId()),username='buyer',email='buyer@example.com')
    def test_cancel_scopes_owner_and_restocks_once(self):
        doc={'_id':ObjectId(),'status':'Chờ xác nhận','items':[{'sku':'A','quantity':2}]};db=self.database(doc)
        with patch.object(orders,'get_database',return_value=db):
            complete(orders.cancel_my_order('CODE',self.user));doc['status']='Đã hủy';complete(orders.cancel_my_order('CODE',self.user))
        self.assertEqual(db.orders.find_one.call_args.args[0]['$or'][0],{'user_id':self.user.id})
        db.products.update_one.assert_awaited_once();self.assertEqual(db.products.update_one.call_args.args[1],{'$inc':{'stock':2}})
        self.assertEqual(db.orders.update_one.call_args.args[0]['status'],'Chờ xác nhận')
    def test_other_owner_not_found(self):
        db=self.database(None)
        with patch.object(orders,'get_database',return_value=db),self.assertRaises(HTTPException) as error: complete(orders.cancel_my_order('CODE',self.user))
        self.assertEqual(error.exception.status_code,404);db.products.update_one.assert_not_awaited()
    def test_shipping_and_delivered_cannot_cancel(self):
        for status in ('Đang giao','Đã giao'):
            db=self.database({'status':status})
            with patch.object(orders,'get_database',return_value=db),self.assertRaises(HTTPException) as error: complete(orders.cancel_my_order('CODE',self.user))
            self.assertEqual(error.exception.status_code,409);db.products.update_one.assert_not_awaited()


class ComparisonTests(unittest.TestCase):
    def call(self,skus,docs):
        db=SimpleNamespace(products=SimpleNamespace(find=lambda *args:SimpleNamespace(to_list=AsyncMock(return_value=docs))))
        with patch.object(products,'get_database',return_value=db): return complete(products.compare_products(skus))
    def test_same_category_and_requested_order(self):
        rows=[{'sku':'B','category':{'id':'CPU'}},{'sku':'A','category':{'id':'CPU'}}]
        self.assertEqual([p['sku'] for p in self.call(['A','B'],rows)],['A','B'])
    def test_wrong_category_missing_and_duplicates(self):
        for skus,rows,expected in [(['A','B'],[{'sku':'A','category':{'id':'CPU'}},{'sku':'B','category':{'id':'RAM'}}],422),(['A','B'],[{'sku':'A','category':{'id':'CPU'}}],404),(['A','A'],[],422),(['A'],[],422),(['A','B','C','D','E'],[],422)]:
            with self.subTest(skus=skus),self.assertRaises(HTTPException) as error:self.call(skus,rows)
            self.assertEqual(error.exception.status_code,expected)

# Optional real replica-set tests use isolated week2_test_* databases from the shared fixture.
import os
import asyncio
from tests import test_week2 as week2

@unittest.skipUnless(os.getenv('TEST_MONGODB_URI'), 'TEST_MONGODB_URI is required for real transaction tests')
class CustomerMongoTests(unittest.IsolatedAsyncioTestCase):
    asyncSetUp=week2.MongoDBFlowTests.asyncSetUp
    asyncTearDown=week2.MongoDBFlowTests.asyncTearDown
    payload=week2.MongoDBFlowTests.payload

    async def test_two_cancellations_restore_stock_once(self):
        before=await self.db.products.find_one({'sku':'SP01'})
        order=await orders.create_order(self.payload(),self.buyer)
        results=await asyncio.gather(orders.cancel_my_order(order['order_code'],self.buyer),orders.cancel_my_order(order['order_code'],self.buyer))
        self.assertTrue(all(result['status']=='Đã hủy' for result in results))
        self.assertEqual((await self.db.products.find_one({'sku':'SP01'}))['stock'],before['stock'])

    async def test_cancel_racing_shipping_has_consistent_stock(self):
        before=await self.db.products.find_one({'sku':'SP01'})
        order=await orders.create_order(self.payload(),self.buyer)
        await asyncio.gather(orders.cancel_my_order(order['order_code'],self.buyer),orders.update_order_status(order['order_code'],'Đang giao'),return_exceptions=True)
        after=await self.db.orders.find_one({'order_code':order['order_code']})
        self.assertIn(after['status'],['Đã hủy','Đang giao'])
        self.assertEqual((await self.db.products.find_one({'sku':'SP01'}))['stock'],before['stock']-(0 if after['status']=='Đã hủy' else 1))

    async def test_addresses_are_embedded_and_owner_scoped(self):
        address=account.AddressWrite(**self.address,label='Home')
        with patch.object(account,'get_database',return_value=self.db):
            saved=await account.add_address(address,self.buyer)
            self.assertEqual(saved['default_address_id'],saved['addresses'][0]['id'])
            stranger=UserResponse(id=str(ObjectId()),username='stranger',email='stranger@example.com')
            await self.db.users.insert_one({'_id':ObjectId(stranger.id),'username':'stranger','email':stranger.email,'cart':[]})
            with self.assertRaises(HTTPException): await account.edit_address(saved['addresses'][0]['id'],address,stranger)
            self.assertEqual(len((await self.db.users.find_one({'_id':self.buyer_id}))['addresses']),1)
