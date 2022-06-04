_(This is just a draft for my own convenience. The protocol will be properly defined later)_

transaction byte:
```
+-+-+-+-+-+-+-+-+
|    tran id    |
+-+-+-+-+-+-+-+-+
```

prefix byte:
```
+-+-+-+-+-+-+-+-+
| t |H|O|  xxx  |
+-+-+-+-+-+-+-+-+
```
`O`: at least one optional field included (ignored for `update entity`, `method error` and `tran syn`)\
`H`: optional fields encoded using high-packing mode\
`t` value:\
serverbound:
  - 0: invoke method
  - 1: update entity
  - 2: confirmation response
  - 3: tran syn

clientbound:
  - 0: method return
  - 1: entity update
  - 2: confirmation request (4 LSB = conf id)
  - 3: method error

invoke method:
```
+-+-+-+-+-+-+-+-+     +-+-+-+-+-+
|E|  method id  |  ^  | fields . . .
+-+-+-+-+-+-+-+-+  |  +-+-+-+-+-+
           +-+-+-+-+-+-+-+-+
    (E=1)  |I| entity type |   ^
           +-+-+-+-+-+-+-+-+   |
                       +---------------+
                (I=1)  |      id       |
                       +---------------+
```
update entity/entity update:
```
+-+-+-+-+-+-+-+-+-+-+-+-+-+
|H|O|entity type| fields . . .
+-+-+-+-+-+-+-+-+-+-+-+-+-+
```
confirmation response/request:
```
+-+-+-+-+-+
| fields . . .
+-+-+-+-+-+
```
tran syn: no data\
method return:
```
+-+-+-+-+-+
| fields . . .
+-+-+-+-+-+
```
method error:
```
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|              code             | message . . .
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
```

normal field encoding mode:
```
+---------------------+-+-+-+-+-+-+-+-+-------------+-+-+-+-+-+-+-+-+-------------+----
| required field vals |  opt f 0 id   | opt f 0 val |  opt f 1 id   | opt f 1 val | . . .
+---------------------+-+-+-+-+-+-+-+-+-------------+-+-+-+-+-+-+-+-+-------------+----
```
high-packing field encoding mode:
```
+---------------------+-----------------------+----------------+
| required field vals | opt field presence bf | opt field vals |
+---------------------+-----------------------+----------------+
```