import asyncio
import websockets


async def main():
    uri = "ws://127.0.0.1:8000/ws/global"

    async with websockets.connect(uri) as ws:
        print("CONNECTED:", await ws.recv())

        await ws.send('{"type":"PING"}')

        print("RESPONSE:", await ws.recv())


asyncio.run(main())