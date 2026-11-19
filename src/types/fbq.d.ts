type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

interface FbqFunction {
  (...args: JsonValue[]): void;
  callMethod?: (...args: JsonValue[]) => void;
  queue?: JsonValue[];
  push?: FbqFunction;
  loaded?: boolean;
  version?: string;
}

interface Window {
  fbq?: FbqFunction;
  _fbq?: FbqFunction;
}
