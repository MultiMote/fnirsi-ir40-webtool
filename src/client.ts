const SERVICE_ID: number = 0xee01;
const RX_CHARACTERISTIC_ID: number = 0xee02;
const TX_CHARACTERISTIC_ID: number = 0xee03;

const bufToHex = (buf: DataView | Uint8Array | number[]) => {
  let arr = [];

  if (buf instanceof DataView) {
    for (let i = 0; i < buf.byteLength; i++) {
      arr.push(buf.getUint8(i));
    }
  } else if (buf instanceof Uint8Array) {
    arr = Array.from(buf);
  } else {
    arr = buf;
  }

  return arr.map((i) => i.toString(16).padStart(2, "0").toUpperCase()).join(" ");
};

export class RangeFinderClient {
  private gattServer?: BluetoothRemoteGATTServer = undefined;
  private rx?: BluetoothRemoteGATTCharacteristic = undefined;
  private tx?: BluetoothRemoteGATTCharacteristic = undefined;

  public onDisconnect?: () => void;
  public onConnect?: () => void;
  public onMeasure?: (value: number) => void;

  public async connect(): Promise<void> {
    this.disconnect();

    const options: RequestDeviceOptions = {
      filters: [{ namePrefix: "fnirsi" }, { services: [SERVICE_ID] }],
    };

    const device: BluetoothDevice = await navigator.bluetooth.requestDevice(options);

    if (device.gatt === undefined) {
      throw new Error("Device has no GATT");
    }

    const disconnectListener = () => {
      this.gattServer = undefined;
      this.rx = undefined;
      this.tx = undefined;
      this.onDisconnect?.();

      device.removeEventListener("gattserverdisconnected", disconnectListener);
    };

    device.addEventListener("gattserverdisconnected", disconnectListener);

    const gattServer: BluetoothRemoteGATTServer = await device.gatt.connect();

    const service = await gattServer.getPrimaryService(SERVICE_ID);
    const _rx = await service.getCharacteristic(RX_CHARACTERISTIC_ID);
    const _tx = await service.getCharacteristic(TX_CHARACTERISTIC_ID);

    if (_rx === undefined || _tx === undefined) {
      gattServer.disconnect();
      throw new Error("Required characteristics not found");
    }

    _rx.addEventListener("characteristicvaluechanged", (event: Event) => {
      const target = event.target as BluetoothRemoteGATTCharacteristic;
      this.processRawPacket(target.value!);
    });

    await _rx.startNotifications();

    this.gattServer = gattServer;
    this.rx = _rx;
    this.tx = _tx;

    this.onConnect?.();
  }

  public disconnect() {
    this.gattServer?.disconnect();
    this.gattServer = undefined;
    this.rx = undefined;
    this.tx = undefined;
  }

  public isConnected(): boolean {
    return this.gattServer !== undefined && this.rx !== undefined && this.tx !== undefined;
  }

  protected processRawPacket(data: DataView) {
    if (data.byteLength === 0) {
      return;
    }
    console.log(`<< ${bufToHex(data)}`);

    // basic measure
    if (data.byteLength === 23) {
      const value = data.getUint16(14, false) / 1000.0;
      this.onMeasure?.(value);
    }
  }

  public async send(data: Uint8Array | number[]) {
    if (this.tx === undefined) {
      throw new Error("TX channel closed");
    }

    console.log(`>> ${bufToHex(data)}`);

    if (data instanceof ArrayBuffer) {
      await this.tx.writeValue(data);
    } else {
      await this.tx.writeValue(new Uint8Array(data));
    }
  }

  public async startContinuousMeasure() {
    await this.send([0x00, 0x07, 0x02, 0x08, 0x0e, 0x00, 0x00, 0x00, 0x01]);
  }

  public async stopContinuousMeasure() {
    await this.send([0x00, 0x07, 0x02, 0x08, 0x0e, 0x00, 0x00, 0x00, 0x00]);
  }
}
