"""Regression checks for the week-two customer flow.

Run from backend with python -m unittest discover -s tests -v.
Set TEST_MONGODB_URI to a dedicated replica-set URI to include database integration tests.
Integration tests create and delete only a uniquely named week2_test_ database.
"""
import asyncio
import copy
import json
import os
from pathlib import Path
import unittest
from unittest.mock import AsyncMock, patch
from types import SimpleNamespace

from bson import ObjectId
from fastapi import HTTPException
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import ValidationError

from app.models.order import CartEntry, OrderCreateRequest
from app.models.pc_builder import CompatibilityCheckRequest
from app.models.user import UserResponse
from app.routers import orders, pc_builder
from app.services.cart import combine_items

FIXTURES = json.loads((Path(__file__).resolve().parents[1] / "database" / "seed_data.json").read_text(encoding="utf-8-sig"))
PRODUCTS = {item["sku"]: item for item in FIXTURES["products"]}


class CompatibilityTests(unittest.TestCase):
    def test_cart_rejects_fractional_and_coerced_quantities(self):
        for quantity in (True, 1.5, "2", 0, 1000):
            with self.subTest(quantity=quantity), self.assertRaises(ValidationError):
                CartEntry(sku="SP01", quantity=quantity)

    def test_unknown_builder_slots_are_rejected(self):
        with self.assertRaises(ValidationError):
            CompatibilityCheckRequest(unknown_sku="SP01")

    def test_socket_mismatch(self):
        result = pc_builder.evaluate_components({"cpu": PRODUCTS["SP01"], "mainboard": PRODUCTS["SP05"]})
        self.assertFalse(result.is_compatible)
        self.assertTrue(any(message.type == "error" and message.component == "CPU & Mainboard" for message in result.messages))

    def test_ram_mismatch(self):
        result = pc_builder.evaluate_components({"mainboard": PRODUCTS["SP07"], "ram": PRODUCTS["SP08"]})
        self.assertFalse(result.is_compatible)

    def test_underpowered_psu_and_total(self):
        psu = copy.deepcopy(PRODUCTS["SP17"])
        psu["specs"]["wattage"] = 100
        result = pc_builder.evaluate_components({"cpu": PRODUCTS["SP02"], "gpu": PRODUCTS["SP16"], "psu": psu})
        self.assertFalse(result.is_compatible)
        self.assertEqual(result.estimated_wattage, 525)
        self.assertEqual(result.total_price, PRODUCTS["SP02"]["price"] + PRODUCTS["SP16"]["price"] + psu["price"])

    def test_partial_build_warns(self):
        result = pc_builder.evaluate_components({"cpu": PRODUCTS["SP01"]})
        self.assertTrue(result.is_compatible)
        self.assertTrue(any(message.type == "warning" for message in result.messages))

    def test_duplicate_skus_are_combined(self):
        self.assertEqual(combine_items([{"sku": "SP01", "quantity": 2}, {"sku": "SP01", "quantity": 3}]), {"SP01": 5})
        with self.assertRaises(HTTPException):
            combine_items([{"sku": "SP01", "quantity": 1000}])


class RouteTests(unittest.IsolatedAsyncioTestCase):
    async def test_invalid_builder_slot(self):
        db = SimpleNamespace(products=SimpleNamespace(find=lambda *args: SimpleNamespace(to_list=AsyncMock(return_value=[PRODUCTS["SP01"]]))))
        with patch.object(pc_builder, "get_database", return_value=db):
            with self.assertRaises(HTTPException) as error:
                await pc_builder.check_compatibility(CompatibilityCheckRequest(ram_sku="SP01"))
        self.assertEqual(error.exception.status_code, 422)

    async def test_order_identity_is_scoped_to_customer(self):
        buyer = UserResponse(id=str(ObjectId()), username="buyer", email="buyer@example.com")
        scoped = orders.owner_filter(buyer)
        self.assertEqual(scoped["$or"][0]["user_id"], buyer.id)
        self.assertEqual(scoped["$or"][1]["customer_email"], buyer.email)

    async def test_checkout_retry_returns_existing_order(self):
        buyer = UserResponse(id=str(ObjectId()), username="buyer", email="buyer@example.com")
        existing = {"order_code": "ALREADY_CREATED"}
        db = SimpleNamespace(orders=SimpleNamespace(find_one=AsyncMock(return_value=existing)))
        payload = OrderCreateRequest(
            request_id="checkout-retry-1",
            shipping_address={"full_name": "Buyer", "phone": "0901234567", "street": "Street",
                              "province": "Province", "district": "District", "ward": "Ward"},
            items=[{"sku": "SP01", "quantity": 1}],
        )
        with patch.object(orders, "get_database", return_value=db):
            result = await orders.create_order(payload, buyer)
        self.assertEqual(result, existing)
        db.orders.find_one.assert_awaited_once_with({"user_id": buyer.id, "request_id": payload.request_id}, {"_id": 0})


@unittest.skipUnless(os.getenv("TEST_MONGODB_URI"), "TEST_MONGODB_URI is required for real replica-set tests")
class MongoDBFlowTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.client = AsyncIOMotorClient(os.environ["TEST_MONGODB_URI"], serverSelectionTimeoutMS=3000)
        hello = await self.client.admin.command("hello")
        if not hello.get("setName") and hello.get("msg") != "isdbgrid":
            self.client.close()
            self.skipTest("A replica set or mongos is required")
        self.db_name = "week2_test_" + str(ObjectId())
        self.db = self.client[self.db_name]
        await self.db.orders.create_index([("user_id", 1), ("request_id", 1)], unique=True)
        fixtures = copy.deepcopy(FIXTURES)
        await self.db.products.insert_many(fixtures["products"])
        await self.db.locations.insert_many(fixtures["locations"])
        self.buyer_id = ObjectId()
        self.buyer = UserResponse(id=str(self.buyer_id), username="buyer", email="buyer@example.com")
        await self.db.users.insert_one({"_id": self.buyer_id, "username": "buyer", "email": self.buyer.email,
                                        "role": "customer", "cart": [{"sku": "SP01", "quantity": 1}]})
        province = fixtures["locations"][0]
        district = province["districts"][0]
        self.address = {"full_name": "Buyer", "phone": "0901234567", "street": "Street",
                        "province": province["province_name"], "district": district["district_name"],
                        "ward": district["wards"][0]["ward_name"]}
        self.router_patch = patch.object(orders, "get_database", return_value=self.db)
        self.router_patch.start()

    async def asyncTearDown(self):
        if hasattr(self, "router_patch"):
            self.router_patch.stop()
        if hasattr(self, "db_name"):
            assert self.db_name.startswith("week2_test_")
            await self.client.drop_database(self.db_name)
        self.client.close()

    def payload(self, key="checkout-request-1", **changes):
        return OrderCreateRequest(request_id=key, shipping_address=self.address,
                                  items=[{"sku": "SP01", "quantity": 1}], **changes)

    async def test_checkout_snapshot_cart_and_retry(self):
        before = await self.db.products.find_one({"sku": "SP01"})
        result = await orders.create_order(self.payload(), self.buyer)
        retry = await orders.create_order(self.payload(), self.buyer)
        self.assertEqual(result["order_code"], retry["order_code"])
        self.assertEqual(await self.db.orders.count_documents({}), 1)
        product = await self.db.products.find_one({"sku": "SP01"})
        self.assertEqual(product["stock"], before["stock"] - 1)
        self.assertEqual((await self.db.users.find_one({"_id": self.buyer_id}))["cart"], [])
        self.assertEqual(result["total_amount"], before["price"])
        await self.db.products.update_one({"sku": "SP01"}, {"$set": {"name": "Changed", "price": 1}})
        snapshot = await orders.get_order_by_code(result["order_code"], self.buyer)
        self.assertEqual(snapshot["items"][0]["name"], before["name"])
        self.assertEqual(snapshot["items"][0]["unit_price"], before["price"])

    async def test_changed_price_keeps_stock_and_cart(self):
        before = await self.db.products.find_one({"sku": "SP01"})
        with self.assertRaises(HTTPException):
            await orders.create_order(self.payload(expected_total=1), self.buyer)
        self.assertEqual((await self.db.products.find_one({"sku": "SP01"}))["stock"], before["stock"])
        self.assertEqual(await self.db.orders.count_documents({}), 0)
        self.assertTrue((await self.db.users.find_one({"_id": self.buyer_id}))["cart"])

    async def test_failure_after_stock_update_rolls_back(self):
        await self.db.command({"collMod": "orders", "validator": {"$jsonSchema": {"bsonType": "object", "required": ["forced_missing_field"]}}})
        before = await self.db.products.find_one({"sku": "SP01"})
        from pymongo.errors import OperationFailure
        with self.assertRaises(OperationFailure):
            await orders.create_order(self.payload(), self.buyer)
        self.assertEqual((await self.db.products.find_one({"sku": "SP01"}))["stock"], before["stock"])
        self.assertTrue((await self.db.users.find_one({"_id": self.buyer_id}))["cart"])
        self.assertEqual(await self.db.orders.count_documents({}), 0)

    async def test_two_buyers_cannot_buy_the_last_item(self):
        await self.db.products.update_one({"sku": "SP01"}, {"$set": {"stock": 1}})
        second_id = ObjectId()
        second = UserResponse(id=str(second_id), username="second", email="second@example.com")
        await self.db.users.insert_one({"_id": second_id, "cart": [{"sku": "SP01", "quantity": 1}]})
        results = await asyncio.gather(orders.create_order(self.payload("checkout-first"), self.buyer),
                                       orders.create_order(self.payload("checkout-second"), second), return_exceptions=True)
        self.assertEqual(sum(isinstance(item, dict) for item in results), 1)
        self.assertEqual((await self.db.products.find_one({"sku": "SP01"}))["stock"], 0)
        self.assertEqual(await self.db.orders.count_documents({}), 1)

    async def test_other_customer_cannot_read_order(self):
        order = await orders.create_order(self.payload(), self.buyer)
        stranger = UserResponse(id=str(ObjectId()), username="stranger", email="stranger@example.com")
        with self.assertRaises(HTTPException) as error:
            await orders.get_order_by_code(order["order_code"], stranger)
        self.assertEqual(error.exception.status_code, 404)
