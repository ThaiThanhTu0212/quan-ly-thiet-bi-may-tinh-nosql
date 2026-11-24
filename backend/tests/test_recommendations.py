"""Recommendation ranking and dynamic spec validation regression tests."""
import copy
import unittest
from pydantic import ValidationError
from app.routers.admin import ProductWrite
from app.routers.pc_builder import recommendation_for, evaluate_components


def component(sku, category, **specs):
    return {'sku':sku,'name':sku,'category':{'id':category,'name':category},'brand':{'id':'B','name':'B'},'price':100,'stock':10,'specs':specs}

CPU = component('CPU','LSP01',socket='AM5',tdp_watt=120)
MAIN = component('MAIN','LSP02',socket='AM5',ram_type='DDR5',form_factor='Micro-ATX')
RAM = component('RAM','LSP03',ram_type='DDR5',capacity_gb=32)


class RecommendationTests(unittest.TestCase):
    def test_socket_and_ram_match(self):
        self.assertEqual(recommendation_for('mainboard',MAIN,{'cpu':CPU,'ram':RAM})['status'],'compatible')
        mismatch=component('BAD','LSP02',socket='LGA1700',ram_type='DDR4')
        self.assertEqual(recommendation_for('mainboard',mismatch,{'cpu':CPU,'ram':RAM})['status'],'incompatible')

    def test_candidate_replaces_existing_selection(self):
        bad=component('OLD','LSP01',socket='AM4')
        self.assertEqual(recommendation_for('cpu',CPU,{'cpu':bad,'mainboard':MAIN})['status'],'compatible')

    def test_unrelated_conflicts_do_not_hide_gpu(self):
        gpu=component('GPU','LSP05',tdp_watt=200)
        bad=component('BAD','LSP02',socket='LGA1700')
        self.assertEqual(recommendation_for('gpu',gpu,{'cpu':CPU,'mainboard':bad})['status'],'compatible')

    def test_missing_specs_are_not_recommended_as_verified(self):
        unknown=component('UNKNOWN','LSP03')
        self.assertEqual(recommendation_for('ram',unknown,{'mainboard':MAIN})['status'],'unknown')

    def test_psu_uses_entire_selected_configuration(self):
        gpu=component('GPU','LSP05',tdp_watt=300,recommended_psu_watt=750)
        for watts,status in [(100,'incompatible'),(650,'warning'),(1000,'compatible')]:
            with self.subTest(watts=watts):
                psu=component('PSU','LSP06',wattage=watts)
                self.assertEqual(recommendation_for('psu',psu,{'cpu':CPU,'gpu':gpu})['status'],status)

    def test_case_board_aliases_and_gpu_length(self):
        case=component('CASE','LSP07',supported_motherboards=['mATX'],max_gpu_length_mm=300)
        self.assertEqual(recommendation_for('case',case,{'mainboard':MAIN})['status'],'compatible')
        gpu=component('GPU','LSP05',length_mm=350)
        self.assertEqual(recommendation_for('case',case,{'gpu':gpu})['status'],'incompatible')

    def test_out_of_stock_is_explicit(self):
        cpu=copy.deepcopy(CPU);cpu['stock']=0
        self.assertEqual(recommendation_for('cpu',cpu,{'mainboard':MAIN})['status'],'out_of_stock')

    def test_legacy_non_numeric_power_does_not_crash(self):
        cpu=component('OLD','LSP01',tdp_watt='unknown')
        self.assertGreaterEqual(evaluate_components({'cpu':cpu}).estimated_wattage,0)

    def test_specs_types_and_extension_fields(self):
        base=dict(sku='TEST',name='Test',category={'id':'LSP01','name':'CPU'},brand={'id':'B','name':'Brand'},price=1,stock=1)
        for specs in [{'tdp_watt':'120'},{'socket':{}},{'supported_sockets':'AM5, AM4'},{'vram_gb':-2}]:
            with self.subTest(specs=specs),self.assertRaises(ValidationError):ProductWrite(**base,specs=specs)
        good=ProductWrite(**base,specs={'socket':'AM5','tdp_watt':120,'supported_sockets':['AM5'],'custom_feature':'kept'})
        self.assertEqual(good.specs['custom_feature'],'kept')
