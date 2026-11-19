import uuid
from typing import Dict, Any, List
from fastapi import APIRouter, HTTPException
from app.database.connection import get_database
from app.models.pc_builder import (
    CompatibilityCheckRequest,
    CompatibilityCheckResponse,
    CompatibilityMessage,
    PCBuildSaveRequest,
    PCBuildResponse
)

router = APIRouter(prefix="/pc-builder", tags=["PC Builder Engine"])

@router.post("/check-compatibility", response_model=CompatibilityCheckResponse)
async def check_compatibility(payload: CompatibilityCheckRequest):
    """
    Thuật toán kiểm tra tính tương thích của dàn PC (Socket, Chuẩn RAM, Công suất nguồn PSU, Kích thước Case).
    """
    db = get_database()
    skus_to_fetch = [
        sku for sku in [
            payload.cpu_sku, payload.mainboard_sku, payload.ram_sku,
            payload.gpu_sku, payload.psu_sku, payload.storage_sku,
            payload.case_sku, payload.cooler_sku
        ] if sku
    ]

    selected_docs = {}
    if skus_to_fetch:
        cursor = db.products.find({"sku": {"$in": skus_to_fetch}}, {"_id": 0})
        async for doc in cursor:
            selected_docs[doc["sku"]] = doc

    cpu = selected_docs.get(payload.cpu_sku)
    mainboard = selected_docs.get(payload.mainboard_sku)
    ram = selected_docs.get(payload.ram_sku)
    gpu = selected_docs.get(payload.gpu_sku)
    psu = selected_docs.get(payload.psu_sku)
    cooler = selected_docs.get(payload.cooler_sku)
    case = selected_docs.get(payload.case_sku)
    storage = selected_docs.get(payload.storage_sku)

    messages: List[CompatibilityMessage] = []
    is_compatible = True

    # 1. KIỂM TRA TƯƠNG THÍCH SOCKET: CPU VS MAINBOARD
    if cpu and mainboard:
        cpu_socket = cpu.get("specs", {}).get("socket")
        main_socket = mainboard.get("specs", {}).get("socket")
        if cpu_socket and main_socket:
            if cpu_socket.strip().upper() == main_socket.strip().upper():
                messages.append(CompatibilityMessage(
                    type="success",
                    component="CPU & Mainboard",
                    message=f"Tương thích Socket: Cả CPU '{cpu['name']}' và Mainboard '{mainboard['name']}' đều sử dụng socket {cpu_socket}."
                ))
            else:
                is_compatible = False
                messages.append(CompatibilityMessage(
                    type="error",
                    component="CPU & Mainboard",
                    message=f"KHÔNG TƯƠNG THÍCH SOCKET: CPU '{cpu['name']}' dùng socket {cpu_socket}, nhưng Mainboard '{mainboard['name']}' lại dùng socket {main_socket}!"
                ))

    # 2. KIỂM TRA CHUẨN RAM: MAINBOARD VS RAM
    if mainboard and ram:
        main_ram_type = mainboard.get("specs", {}).get("ram_type")
        ram_type = ram.get("specs", {}).get("ram_type")
        if main_ram_type and ram_type:
            if main_ram_type.strip().upper() == ram_type.strip().upper():
                messages.append(CompatibilityMessage(
                    type="success",
                    component="Mainboard & RAM",
                    message=f"Tương thích chuẩn RAM: Mainboard và thanh RAM đều thuộc chuẩn {ram_type}."
                ))
            else:
                is_compatible = False
                messages.append(CompatibilityMessage(
                    type="error",
                    component="Mainboard & RAM",
                    message=f"KHÔNG TƯƠNG THÍCH RAM: Bo mạch chủ yêu cầu chuẩn {main_ram_type}, trong khi thanh RAM bạn chọn là chuẩn {ram_type}!"
                ))

    # 3. KIỂM TRA TẢN NHIỆT VS SOCKET CPU
    if cpu and cooler:
        cpu_socket = cpu.get("specs", {}).get("socket")
        supported_sockets = cooler.get("specs", {}).get("supported_sockets", [])
        if cpu_socket and supported_sockets:
            matched = any(cpu_socket.strip().upper() in s.upper() for s in supported_sockets)
            if matched:
                messages.append(CompatibilityMessage(
                    type="success",
                    component="Tản nhiệt CPU",
                    message=f"Tương thích chân tản nhiệt: Tản nhiệt hỗ trợ socket {cpu_socket} của CPU."
                ))
            else:
                messages.append(CompatibilityMessage(
                    type="warning",
                    component="Tản nhiệt CPU",
                    message=f"LƯU Ý: Tản nhiệt '{cooler['name']}' có thể cần gá lắp riêng để gắn lên socket {cpu_socket}."
                ))

    # 4. TÍNH TOÁN CÔNG SUẤT TIÊU THỤ ƯỚC TÍNH (ESTIMATED WATTAGE)
    cpu_tdp = cpu.get("specs", {}).get("tdp_watt", 65) if cpu else 0
    gpu_tdp = gpu.get("specs", {}).get("tdp_watt", 150) if gpu else 0
    base_system_wattage = 80 if (cpu or mainboard or ram) else 0

    total_estimated_wattage = cpu_tdp + gpu_tdp + base_system_wattage
    # Công suất PSU tối thiểu khuyến nghị
    gpu_recommended_psu = gpu.get("specs", {}).get("recommended_psu_watt", 0) if gpu else 0
    recommended_psu_wattage = max(gpu_recommended_psu, total_estimated_wattage + 150)

    # 5. KIỂM TRA NGUỒN (PSU)
    if psu:
        psu_wattage = psu.get("specs", {}).get("wattage", 0)
        if psu_wattage < total_estimated_wattage:
            is_compatible = False
            messages.append(CompatibilityMessage(
                type="error",
                component="Nguồn (PSU)",
                message=f"THIẾU CÔNG SUẤT NGUỒN: Bộ nguồn chỉ có {psu_wattage}W, không đủ gánh công suất tiêu thụ ước tính tối thiểu {total_estimated_wattage}W!"
            ))
        elif psu_wattage < recommended_psu_wattage:
            messages.append(CompatibilityMessage(
                type="warning",
                component="Nguồn (PSU)",
                message=f"KHUYẾN NGHỊ: Bộ nguồn {psu_wattage}W vừa đủ chạy nhưng card đồ họa/hệ thống khuyến nghị nguồn từ {recommended_psu_wattage}W để bền bỉ và nâng cấp."
            ))
        else:
            messages.append(CompatibilityMessage(
                type="success",
                component="Nguồn (PSU)",
                message=f"Nguồn lý tưởng: Công suất {psu_wattage}W đáp ứng hoàn hảo cho hệ thống (Ước tính tiêu thụ: {total_estimated_wattage}W)."
            ))
    elif total_estimated_wattage > 0:
        messages.append(CompatibilityMessage(
            type="warning",
            component="Nguồn (PSU)",
            message=f"Chưa chọn nguồn: Bạn nên chọn bộ nguồn tối thiểu từ {recommended_psu_wattage}W."
        ))

    # 6. KIỂM TRA KÍCH THƯỚC GPU VỚI CASE
    if gpu and case:
        gpu_len = gpu.get("specs", {}).get("length_mm")
        case_max_gpu = case.get("specs", {}).get("max_gpu_length_mm")
        if gpu_len and case_max_gpu:
            if gpu_len > case_max_gpu:
                is_compatible = False
                messages.append(CompatibilityMessage(
                    type="error",
                    component="Vỏ Case & GPU",
                    message=f"VỎ CASE QUÁ NHỎ: Chiều dài card GPU là {gpu_len}mm, vượt quá chiều dài tối đa {case_max_gpu}mm của vỏ case!"
                ))
            else:
                messages.append(CompatibilityMessage(
                    type="success",
                    component="Vỏ Case & GPU",
                    message=f"Vừa vặn: Card đồ họa ({gpu_len}mm) nằm gọn trong case (hỗ trợ tối đa {case_max_gpu}mm)."
                ))

    # Tính tổng giá trị dàn máy
    all_selected = [cpu, mainboard, ram, gpu, psu, cooler, case, storage]
    total_price = sum(item.get("price", 0) for item in all_selected if item)

    components_dict = {
        "cpu": cpu,
        "mainboard": mainboard,
        "ram": ram,
        "gpu": gpu,
        "psu": psu,
        "cooler": cooler,
        "case": case,
        "storage": storage
    }

    return CompatibilityCheckResponse(
        is_compatible=is_compatible,
        messages=messages,
        estimated_wattage=total_estimated_wattage,
        recommended_psu_wattage=recommended_psu_wattage,
        total_price=total_price,
        components=components_dict
    )

@router.post("/save", response_model=PCBuildResponse)
async def save_pc_build(payload: PCBuildSaveRequest):
    """Lưu cấu hình PC người dùng tự dựng vào MongoDB."""
    db = get_database()
    build_code = f"BUILD_{uuid.uuid4().hex[:8].upper()}"

    doc = payload.model_dump()
    doc["build_code"] = build_code

    await db.pc_builds.insert_one(doc)
    return PCBuildResponse(**doc)

@router.get("/builds")
async def get_saved_builds(limit: int = 10):
    """Lấy danh sách các cấu hình PC mẫu hoặc người dùng đã lưu."""
    db = get_database()
    cursor = db.pc_builds.find({}, {"_id": 0}).limit(limit)
    return await cursor.to_list(length=limit)
