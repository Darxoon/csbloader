// Workaround for TS recognizing ArrayBuffer and Uint8Array as the same, even though they are not

interface ArrayBuffer {
	" buffer_kind"?: "array";
}

interface Uint8Array {
	" buffer_kind"?: "uint8";
}
