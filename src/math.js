"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gcd = gcd;
exports.modularExponentiation = modularExponentiation;
function gcd(a, b) {
    var _a;
    while (b !== 0) {
        _a = [b, a % b], a = _a[0], b = _a[1];
    }
    return a;
}
function modularExponentiation(base, exponent, modulus) {
    var result = 1;
    base = base % modulus;
    while (exponent > 0) {
        if (exponent % 2 === 1) {
            result = (result * base) % modulus;
        }
        exponent = Math.floor(exponent / 2);
        base = (base * base) % modulus;
    }
    return result;
}
