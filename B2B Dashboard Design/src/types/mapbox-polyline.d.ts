declare module '@mapbox/polyline' {
    interface PolylineStatic {
        /**
         * Decode a polyline string into an array of coordinate pairs [lat, lng]
         */
        decode(str: string, precision?: number): Array<[number, number]>;

        /**
         * Encode an array of coordinate pairs into a polyline string
         */
        encode(coords: Array<[number, number]> | Array<{ lat: number, lng: number }>, precision?: number): string;
    }

    const polyline: PolylineStatic;
    export default polyline;
}
