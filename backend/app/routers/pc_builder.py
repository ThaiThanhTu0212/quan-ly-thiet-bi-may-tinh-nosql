import uuid
from fastapi import APIRouter, Depends, HTTPException, Query

from app.database.connection import get_database
from app.models.pc_builder import CompatibilityCheckRequest, CompatibilityCheckResponse, PCBuildSaveRequest, PCBuildResponse
from app.models.user import UserResponse
from app.routers.auth import check_origin, require_user

router = APIRouter(tags=["PC Builder"])
SLOTS = {"cpu": "LSP01", "mainboard": "LSP02", "ram": "LSP03", "storage": "LSP04",
         "gpu": "LSP05", "psu": "LSP06", "case": "LSP07", "cooler": "LSP08"}


def normalize(value):
    return str(value).replace(" ", "").upper()


def evaluate_components(components):
    messages = []
    def message(kind, component, text):
        messages.append({"type": kind, "component": component, "message": text})
    def spec(slot):
        return (components.get(slot) or {}).get("specs", {})
    cpu, main, ram = spec("cpu"), spec("mainboard"), spec("ram")
    if components.get("cpu") and components.get("mainboard"):
        matched = cpu.get("socket") and main.get("socket") and normalize(cpu["socket"]) == normalize(main["socket"])
        message("success" if matched else "error", "CPU & Mainboard",
                f"Socket CPU {cpu.get('socket', '?')} / Mainboard {main.get('socket', '?')}.")
    if components.get("mainboard") and components.get("ram"):
        matched = main.get("ram_type") and ram.get("ram_type") and normalize(main["ram_type"]) == normalize(ram["ram_type"])
        message("success" if matched else "error", "Mainboard & RAM",
                f"Mainboard {main.get('ram_type', '?')} / RAM {ram.get('ram_type', '?')}.")
    cooler = spec("cooler")
    if cpu and cooler and cooler.get("supported_sockets"):
        if normalize(cpu.get("socket")) not in {normalize(socket) for socket in cooler["supported_sockets"]}:
            message("error", "Tản nhiệt", "Tản nhiệt không hỗ trợ socket CPU đã chọn.")
    gpu, case = spec("gpu"), spec("case")
    if gpu.get("length_mm", 0) > case.get("max_gpu_length_mm", float("inf")):
        message("error", "GPU & Case", "Card đồ họa dài hơn kích thước case hỗ trợ.")
    tdp = sum(int(item.get("specs", {}).get("tdp_watt", 0)) for slot, item in components.items() if item and slot != "psu")
    estimated = tdp + (80 if any(components.values()) else 0)
    recommended = max(estimated + 150, gpu.get("recommended_psu_watt", 0)) if estimated else 0
    if components.get("psu"):
        watts = spec("psu").get("wattage", 0)
        kind = "error" if watts < estimated else "warning" if watts < recommended else "success"
        message(kind, "Nguồn PSU", f"Nguồn {watts} W, tiêu thụ ước tính {estimated} W, khuyến nghị {recommended} W.")
    elif estimated:
        message("warning", "Nguồn PSU", f"Chưa chọn nguồn. Khuyến nghị từ {recommended} W.")
    missing = [slot for slot in ("cpu", "mainboard", "ram", "storage", "psu", "case", "cooler") if not components.get(slot)]
    if missing:
        message("warning", "Linh kiện", "Cấu hình còn thiếu linh kiện. Bạn có thể tiếp tục bổ sung.")
    return CompatibilityCheckResponse(
        is_compatible=not any(item["type"] == "error" for item in messages),
        messages=messages, estimated_wattage=estimated, recommended_psu_wattage=recommended,
        total_price=sum(item["price"] for item in components.values() if item), components=components,
    )


@router.post("/check-compatibility", response_model=CompatibilityCheckResponse)
async def check_compatibility(payload: CompatibilityCheckRequest):
    selected = {key.removesuffix("_sku"): sku for key, sku in payload.model_dump().items() if sku}
    docs = await get_database().products.find({"sku": {"$in": list(selected.values())}}, {"_id": 0}).to_list(None)
    products = {item["sku"]: item for item in docs}
    components = {slot: None for slot in SLOTS}
    for slot, sku in selected.items():
        product = products.get(sku)
        if product is None:
            raise HTTPException(404, f"Không tìm thấy linh kiện {sku}.")
        if product["category"]["id"] != SLOTS[slot]:
            raise HTTPException(422, f"Linh kiện {sku} không thuộc vị trí {slot}.")
        components[slot] = product
    return evaluate_components(components)


@router.post("/share", response_model=PCBuildResponse, status_code=201, dependencies=[Depends(check_origin)])
@router.post("/save", response_model=PCBuildResponse, include_in_schema=False, dependencies=[Depends(check_origin)])
async def save_pc_build(payload: PCBuildSaveRequest, user: UserResponse = Depends(require_user)):
    if not payload.title.strip() or not payload.components:
        raise HTTPException(422, "Vui lòng đặt tên và chọn linh kiện cho cấu hình.")
    if set(payload.components) - set(SLOTS):
        raise HTTPException(422, "Vị trí linh kiện không hợp lệ.")
    selections = {}
    for slot, item in payload.components.items():
        if item is None:
            continue
        sku = item.get("sku") if isinstance(item, dict) else item
        if not isinstance(sku, str) or not sku:
            raise HTTPException(422, "Mã linh kiện không hợp lệ.")
        selections[f"{slot}_sku"] = sku
    if not selections:
        raise HTTPException(422, "Vui lòng chọn linh kiện.")
    result = await check_compatibility(CompatibilityCheckRequest(**selections))
    doc = {
        **payload.model_dump(), "title": payload.title.strip(), "user_id": user.id,
        "author": user.email, "build_code": uuid.uuid4().hex,
        "components": {slot: item for slot, item in result.components.items() if item},
        "total_price": result.total_price, "estimated_wattage": result.estimated_wattage,
        "is_compatible": result.is_compatible,
    }
    await get_database().pc_builds.insert_one(doc)
    return doc


@router.get("/builds", response_model=list[PCBuildResponse])
async def get_saved_builds(limit: int = Query(10, ge=1, le=100), user: UserResponse = Depends(require_user)):
    return await get_database().pc_builds.find({"user_id": user.id}, {"_id": 0}).limit(limit).to_list(limit)


@router.get("/share/{build_code}", response_model=PCBuildResponse)
async def get_shared_build(build_code: str):
    result = await get_database().pc_builds.find_one({"build_code": build_code}, {"_id": 0})
    if result is None:
        raise HTTPException(404, "Không tìm thấy cấu hình chia sẻ.")
    return result
