import {
  Either,
  isLeft,
  isRight,
  left,
  right,
  map,
  chain,
  Applicative,
} from 'fp-ts/Either';
import { pipe } from 'fp-ts/function';
import * as A from 'fp-ts/Array';

/**
 * Error type returned from Decoders.
 * TODO: Add context information to specify more detail about why a value failed to decode.
 */
export type DecoderError = {
  type: 'decoder';
  message: string;
};

export const error = <T>(message: string): Either<DecoderError, T> => {
  return left({ type: 'decoder', message });
};

export const ok = right;

export type DecoderResult<T> = Either<DecoderError, T>;

/**
 * Decoder takes an input value and returns a DecoderResult which either contains a DecoderError or a successfully decoded result.
 */
export type Decoder<O, I = unknown> = (value: I) => DecoderResult<O>;

/**
 * Utility helper to flatten deeply nested type generics into a format which is prettier for your IDE.
 */
type FlattenType<T> = T extends object
  ? { [K in keyof T]: FlattenType<T[K]> }
  : T;

/**
 * Type helper to infer the type from any given Decoder.
 * @example ```ts
 *  const fooDecoder = D.object({ foo: D.string })
 *  // Create new type from fooDecoder, Foo will equal { foo: string };
 *  type Foo = Infer<typeof fooDecoder>;
 * ```
 */
export type Infer<T extends Decoder<any>> = FlattenType<_Infer<T>>;

type _Infer<T extends Decoder<any>> = T extends Decoder<infer A>
  ? A extends Record<PropertyKey, Decoder<any>>
    ? InferDecoderObjectType<A>
    : A
  : never;

type InferDecoderObjectType<T extends Record<PropertyKey, Decoder<any>>> = {
  [K in keyof T]: _Infer<T[K]>;
};

/**
 * Creates an optional decoder from a given decoder.
 * Allows input values to be undefined.
 * @param decoder
 * @example ```ts
 * // Creates a decoder that accepts values of type string or undefined.
 * const decoder = D.optional(D.string)
 * ```
 */
export function optional<O, I = unknown>(
  decoder: Decoder<O, I>
): Decoder<O | undefined, I> {
  return (value: I) => {
    if (value === undefined) return right(undefined);
    return decoder(value);
  };
}

/**
 * Creates a union decoder from an array of decoders.
 * Union decoder checks if input value matches any of the provided decoders.
 * @param decoders
 * @example ```ts
 * const fooDecoder = D.object({ common: D.number , foo: D.string });
 * const barDecoder = D.object({ common: D.number, bar: D.string });
 * // Creates a union which will successfully decode { common: 1, foo: 'a' } and { common: 3, bar: 'b' }
 * const unionDecoder = D.union([barDecoder, fooDecoder])
 * ```
 */
export function union<A, B, C, D, E, I = unknown>(
  decoders: [
    Decoder<A, I>,
    Decoder<B, I>,
    Decoder<C, I>,
    Decoder<D, I>,
    Decoder<E, I>
  ]
): Decoder<A | B | C | D | E, I>;
export function union<A, B, C, D, I = unknown>(
  decoders: [Decoder<A, I>, Decoder<B, I>, Decoder<C, I>, Decoder<D, I>]
): Decoder<A | B | C | D, I>;
export function union<A, B, C, I = unknown>(
  decoders: [Decoder<A, I>, Decoder<B, I>, Decoder<C, I>]
): Decoder<A | B | C, I>;
export function union<A, B, I = unknown>(
  decoders: [Decoder<A, I>, Decoder<B, I>]
): Decoder<A | B, I>;
export function union<A, I = unknown>(decoders: [Decoder<A, I>]): Decoder<A, I>;
export function union<I = unknown>(
  decoders: readonly Decoder<any>[]
): Decoder<any, I> {
  return (input: I) => {
    // TODO: write this elegantly and cover edge case;
    for (const decoder of decoders) {
      const result = decoder(input);
      if (isRight(result)) return result;
    }
    return error('Value is not one of type');
  };
}

function isObject(v: unknown): v is Record<string, unknown> {
  return Object.prototype.toString.call(v) === '[object Object]';
}

function isPrimitive(v: unknown): v is number | string | undefined {
  return typeof v === 'number' || typeof v === 'string' || v === undefined;
}

function filterIntersection(input: unknown): (values: unknown[]) => any {
  return (values) => {
    if (isPrimitive(input)) return input;
    if (Array.isArray(input)) {
      // What about an array?
      return input;
    }
    if (!isObject(input)) {
      return input;
    }
    const r: any = {};
    for (const v of values) {
      if (!isObject(v)) {
        // this should not be possible, but what do we do in this case?
        continue;
      }
      for (const k in v) {
        if (hasOwnProperty(input, k)) {
          // what about deeply nested values?
          r[k] = input[k];
        }
      }
    }
    return r;
  };
}

/**
 * Creates an intersection decoder from an array of decoders.
 * Intersection decoder checks if input value matches all provided decoders.
 * @param decoders
 * @example ```ts
 * const fooDecoder = D.object({ foo: D.string });
 * const barDecoder = D.object({ bar: D.string });
 * // Creates a union which will successfully decode { foo: 'a', bar: 'b' }
 * const unionDecoder = D.union([barDecoder, fooDecoder])
 * ```
 */
export function intersection<A, B, C, I = unknown>(
  decoders: [Decoder<A, I>, Decoder<B, I>, Decoder<C, I>]
): Decoder<A & B & C, I>;
export function intersection<A, B, I = unknown>(
  decoders: [Decoder<A, I>, Decoder<B, I>]
): Decoder<A & B, I>;
export function intersection<A, I = unknown>(
  decoders: [Decoder<A, I>]
): Decoder<A, I>;
export function intersection<I = unknown>(
  decoders: Decoder<any>[]
): Decoder<any, I> {
  return (input: I) => {
    return pipe(
      decoders,
      A.map((decoder) => decoder(input)),
      A.sequence(Applicative),
      map(filterIntersection(input))
    );
  };
}

function hasOwnProperty<X extends object, Y extends PropertyKey>(
  obj: X,
  prop: Y
): obj is X & Record<Y, unknown> {
  return obj.hasOwnProperty(prop);
}

/**
 * Creates an object decoder from an object of key/decoder pairs.
 * Object decoder checks that the input value is an object that has key/value pairs valid for the specified decoders.
 * @example ```ts
 * // Creates a decoder that will successfully decode input value: { a: 'aaa', b: 123 }.
 * const decoder = D.object({ a: D.string, b: D.optional(D.number) });
 * ```
 */
export function object<
  T extends Record<PropertyKey, Decoder<any>>,
  O extends FlattenType<InferDecoderObjectType<T>>
  >(o: T): Decoder<O> {
  return (v: unknown) => {
    if (typeof v !== 'object') return error('Not an object');
    if (Array.isArray(v)) return error('Not an object');
    if (v == null) return error('Not an object');
    let result: DecoderResult<Record<string, any>> = ok({});
    for (const [key, decoder] of Object.entries(o)) {
      if (isLeft(result)) {
        break;
      }
      result = pipe(
        result,
        chain((decodedValue) => {
          const inputValue = hasOwnProperty(v, key) ? v[key] : undefined;
          return pipe(
            inputValue,
            decoder,
            map((v) => {
              decodedValue[key] = v;
              return decodedValue;
            })
          );
        })
      );
    }
    return result as DecoderResult<O>;
  };
}

/**
 * Creates an array decoder from a given decoder.
 * Array decoder checks that the input value is an array that has all members valid for the provided decoder.
 * @example ```ts
 * // Creates a decoder that will successfully decode input value: [1, undefined, 3].
 * const decoder = D.array(D.optional(D.number)));
 * ```
 */
export function array<T>(decoder: Decoder<T>): Decoder<T[]> {
  return (v: unknown) => {
    if (Array.isArray(v)) {
      return pipe(v, A.map(decoder), A.sequence(Applicative));
    }
    return error('Not an array');
  };
}

type EnumLike = {
  [id: string]: number | string;
  [nu: number]: string;
};

/**
 * Creates an enum decoder from a typescript enum.
 * Enum decoder checks if input value can be converted to a type of the specified enum.
 * @param e
 * @example ```ts
 * enum MyEnum {
 *   A = 1,
 *   B = 2,
 * }
 * // Creates a decoder that will successfully decode input value of 1 or 'A' to MyEnum.A.
 * const decoder = D.enum(MyEnum);
 * ```
 */
export function enumValue<T extends EnumLike>(e: T): Decoder<T[keyof T]> {
  return (v: unknown) => {
    if (typeof v !== 'number' && typeof v !== 'string') {
      return error('Not an enum value');
    }
    const value = e[v];
    if (value == null) {
      return error('Not an enum value');
    }
    if (typeof value === 'number') {
      return right(e[v] as T[keyof T]);
    }
    return right(e[value] as T[keyof T]);
  };
}

/**
 * Creates a literal decoder from a given string or number.
 * Literal decoder checks if input value is explicitly equal to the specified value.
 * @param value
 * @example ```ts
 * // Creates a decoder that will successfully decode input value 'Strict' and fail for all other values.
 * const decoder = D.enum('Strict');
 * ```
 */
export function literal<T extends string | number, I = unknown>(
  value: T
): Decoder<T, I> {
  return (v: I) => {
    if (
      (typeof v === 'number' || typeof v === 'string') &&
      value === v.valueOf()
    ) {
      return right(value);
    }
    return error('Does not match literal value');
  };
}

/**
 * A number decoder - successfully decodes input values that are numbers and fails otherwise.
 * @param v
 */
export function number(v: unknown): DecoderResult<number> {
  if (typeof v !== 'number' || isNaN(v)) return error('Not a number');
  return right(v);
}

/**
 * A string decoder - successfully decodes input values that are strings and fails otherwise.
 * @param v
 */
export function string(v: unknown): DecoderResult<string> {
  if (typeof v !== 'string') return error('Not a string');
  return right(v);
}

export function boolean(v: unknown): DecoderResult<boolean> {
  // TODO: implement this properly
  return right(!!v);
}
