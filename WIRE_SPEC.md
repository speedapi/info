<img align="right" width="128" src="logos/logo_color.png">

# Introduction
This document formally describes the network data format in detail.

Modal verbs (must, should, etc.) in all caps MUST be interpreted as specified by [RFC2119](https://datatracker.ietf.org/doc/html/rfc2119).

Before implementing a driver for SpeedAPI, read the following requirements for the underlying transport layer:
  - if the protocol is datagram/packet/frame-based, it MUST be reliable (datagrams MUST NOT get lost), but it MAY be unordered (datagram order MAY be lost);
  - if the protocol is stream-based, it MUST be both reliable and ordered.

# Definitions
  - A **transaction** is a sequence of segments that together represent one operation - a method invocation or a force entity push by the server. Individual segments from unrelated transactions SHOULD be interleaved for transactional concurrency.
  - A **segment** is one element of a transaction. There are 6 segment types, 4 of which are clientbound with the rest being serverbound. One segment completely represents one micro-action within a transaction.
  - A **session** is the list of all transactions that took place since a client-server connection was established up to the moment of its destruction.
  - A segment is called **serverbound** if it's sent to the server by the client. Segments sent in the opposite direction are called **clientbound**.
  - In the context of one octet, the notation "bit n" MUST be interpreted as "nth least significant bit"

# Data encoding

## Atomic data types
Atomic data types MUST be encoded as follows:
  - `Int(n)` represents an unsigned integer `n` octets (`n*8` bits) in size. It MUST be encoded in standard network octet order (most significant octet first).
  - `Str` represents a Unicode character string. It MUST be encoded in UTF-8 and prefixed with an `Int(2)` specifying the size of UTF-8 data.
  - `List(t, n)` represents a list of elements or a partial update thereof. All elements MUST be of the specified type `t` and their number MUST not exceed `15/16 * 2^(n*8)`. It MUST be encoded by concatenating the encoding of each element and prefixing the result with an `Int(n)` specifying the total number of elements. (TODO: describe PLUs)

## Field arrays
Field arrays represent a set of fields grouped together. Each field MUST either be required or optional. The order of required fields MUST be remembered by both communicating parties. The order of optional fields SHOULD NOT be remembered, however each optional field MUST be associated with a scope-unique `Int(1)` identifier.

The process of encoding a field array MUST produce an octet stream and two auxillary bits that MAY be communicated separately, for example by the enclosing structure. The process of decoding a field array MUST take the octet stream and both auxillary bits into account.

The auxillary bits are named `H` and `O` and MUST specify the encoding mode of optional fields.
  - the `O` bit, when set, MUST signal the presence of any number of optional fields;
  - the `H` bit, when set, MUST signal the use of "high-packing" mode in optional field encoding. The `H` field MUST not be set when the `O` bit is reset.

# Segment encoding
Each segment MUST start with two metadata octets followed by the payload.

## Identifier
The first metadata octet MUST contain the transaction identifier (0-255) that this segment belongs to. Identifiers for finalized transactions SHOULD be reused. Two simultaneous transactions MUST NOT use the same identifier.

## Prefix
The second metadata octet is called the prefix octet. Its two most significant bits MUST be set to the numeric segment type; its 5th bit MUST contain the value of the `H` bit of the top-level field array, if present; its 4th bit MUST contain the value of the `O` bit of the top-level field array, if present; the 4 least significant bits SHOULD be ignored unless the segment calls for their usage.

The segment type MUST be inferred based on its numerical value as indicated by the prefix octet and the direction it was sent in.

# Segment types

## Serverbound
### `InvokeMethod` (0)
The payload MUST start with an octet where the 7 least significant bits specify the method identifier and the most significant bit, when set, MUST signal the presence of an entity type octet directly following this octet.

The entity type octet MUST contain the entity type in its 6 least significant bits, its most significant bit, when set, MUST signal the presence of an entity identifier directly following this octet, and the 6th bit SHOULD be ignored.

The entity identifier MUST be encoded in correspondence with the type of the `id` field of that entity type as defined by the user.

The top-level field array containing method parameters MUST directly follow the last octet of the last previous subsection of this segment.

### `ConfResp` (2)
The payload MUST consist entirely of the field array with supplementary response data.

## Clientbound
### `MethodRet` (0)
The payload MUST consist entirely of the field array with method return fields.

### `EntityUpd` (1)
The first octet of the payload MUST contain the entity type in its 6 least significant bits, and its 7th and 6th bits MUST be interpreted as `H` and `O` bits for the top-level field array structure. `H` and `O` bits in the prefix octet MUST be disregarded.

The rest of the payload MUST directly follow this context and contain the top-level fields of the entity update.

### `ConfReq` (2)
The payload MUST consist entirely of the field array with supplementary request data. The 4 least significant bits of the prefix octet MUST specify the type of the confirmation.

### `MethodErr` (3)
The first 2 octets MUST form an `Int(2)` containing a unique machine-readable per error type.

The rest of the payload MUST directly follow these octets and contain a human-readable error message encoded as a `Str`.
