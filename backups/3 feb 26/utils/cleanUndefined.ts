
/**
 * Recursively removes undefined values from an object.
 * Firestore does not support 'undefined' (only 'null').
 */
export const cleanUndefined = <T>(obj: T): T => {
        if (obj === null || obj === undefined) {
                return null as any;
        }

        if (Array.isArray(obj)) {
                return obj.map(item => cleanUndefined(item)) as any;
        }

        if (typeof obj === 'object') {
                // Handle Date objects and Timestamps (pass through)
                if (obj instanceof Date) return obj;
                if ((obj as any).seconds !== undefined && (obj as any).nanoseconds !== undefined) return obj;

                const newObj: any = {};
                Object.keys(obj).forEach(key => {
                        const value = (obj as any)[key];
                        if (value !== undefined) {
                                newObj[key] = cleanUndefined(value);
                        } else {
                                newObj[key] = null; // Convert undefined to null
                        }
                });
                return newObj;
        }

        return obj;
};
