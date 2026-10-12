import asyncio
from typing import Coroutine, Any, Set, Optional

# Set referensi kuat (strong reference) untuk mencegah Garbage Collector (GC)
# mematikan task background di tengah eksekusi panjang.
_background_tasks: Set[asyncio.Task] = set()

def create_tracked_task(coro: Coroutine[Any, Any, Any], name: Optional[str] = None) -> asyncio.Task:
    """
    Membuat asyncio.Task dan menyimpan referensi kuat di _background_tasks
    sampai tugas selesai, lalu otomatis membersihkan referensinya via callback.
    
    Sesuai dengan standar Python Asyncio Task Lifecycle & Alibaba OpenCodeReview
    (mencegah silent task cancellation akibat garbage collection).
    """
    task = asyncio.create_task(coro, name=name)
    _background_tasks.add(task)
    task.add_done_callback(_background_tasks.discard)
    return task
