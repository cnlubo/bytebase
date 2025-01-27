/* eslint-disable */
import * as _m0 from "protobufjs/minimal";

export const protobufPackage = "bytebase.store";

export interface DataSourceOptions {
  /** srv is a boolean flag that indicates whether the host is a DNS SRV record. */
  srv: boolean;
  /** authentication_database is the database name to authenticate against, which stores the user credentials. */
  authenticationDatabase: string;
  /** sid and service_name are used for Oracle. */
  sid: string;
  serviceName: string;
}

function createBaseDataSourceOptions(): DataSourceOptions {
  return { srv: false, authenticationDatabase: "", sid: "", serviceName: "" };
}

export const DataSourceOptions = {
  encode(message: DataSourceOptions, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.srv === true) {
      writer.uint32(8).bool(message.srv);
    }
    if (message.authenticationDatabase !== "") {
      writer.uint32(18).string(message.authenticationDatabase);
    }
    if (message.sid !== "") {
      writer.uint32(26).string(message.sid);
    }
    if (message.serviceName !== "") {
      writer.uint32(34).string(message.serviceName);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): DataSourceOptions {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseDataSourceOptions();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.srv = reader.bool();
          break;
        case 2:
          message.authenticationDatabase = reader.string();
          break;
        case 3:
          message.sid = reader.string();
          break;
        case 4:
          message.serviceName = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  fromJSON(object: any): DataSourceOptions {
    return {
      srv: isSet(object.srv) ? Boolean(object.srv) : false,
      authenticationDatabase: isSet(object.authenticationDatabase) ? String(object.authenticationDatabase) : "",
      sid: isSet(object.sid) ? String(object.sid) : "",
      serviceName: isSet(object.serviceName) ? String(object.serviceName) : "",
    };
  },

  toJSON(message: DataSourceOptions): unknown {
    const obj: any = {};
    message.srv !== undefined && (obj.srv = message.srv);
    message.authenticationDatabase !== undefined && (obj.authenticationDatabase = message.authenticationDatabase);
    message.sid !== undefined && (obj.sid = message.sid);
    message.serviceName !== undefined && (obj.serviceName = message.serviceName);
    return obj;
  },

  fromPartial(object: DeepPartial<DataSourceOptions>): DataSourceOptions {
    const message = createBaseDataSourceOptions();
    message.srv = object.srv ?? false;
    message.authenticationDatabase = object.authenticationDatabase ?? "";
    message.sid = object.sid ?? "";
    message.serviceName = object.serviceName ?? "";
    return message;
  },
};

type Builtin = Date | Function | Uint8Array | string | number | boolean | undefined;

export type DeepPartial<T> = T extends Builtin ? T
  : T extends Array<infer U> ? Array<DeepPartial<U>> : T extends ReadonlyArray<infer U> ? ReadonlyArray<DeepPartial<U>>
  : T extends {} ? { [K in keyof T]?: DeepPartial<T[K]> }
  : Partial<T>;

function isSet(value: any): boolean {
  return value !== null && value !== undefined;
}
