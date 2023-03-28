## Recent
- 3/15 Patient, Observationリソースに対応
- 3/31~ 中断

## **開発環境**
:exclamation: MongoDB(v5.0.9)以降で廃止されたクエリ検索を一部使用しているので、5.09以上のMongo環境だとクエリ検索が機能しない可能性がある
- node.js(v16.15)
- MongoDB(v5.0.9)

## **使い方**
`env.json`のMONGO_HOSTNAME, MONGO_DB_NAMEを自身の環境に合わせてから以下のコマンド

```
npm install
npm start
```
:heavy_check_mark: [詳細な内容](https://gist.github.com/ryumtym/6b00d180652144473bf978428ef7883a)

:exclamation: 上記URLはM学会(2022/09/03)で説明時に使用したgistのため、一部差異がある可能性あり。

## **GETリクエスト & クエリ**
### **[search type](https://www.hl7.org/fhir/search.html#Summary)**
| Type        | modif/prefix :heavy_check_mark:                   |
| :------     | :--                                               |
| string      | `:missing` `:contains` `:exact` `and/or`          |
| date        | `:missing` `eq` `ne` `gt` `lt` `ge` `le`, `and/or`|
| token       | `:missing`  `:text` `:not`   `and/or`             |
| reference   | `:missing` `and/or`           |
| quantity    | `:missing` `and/or`           |
| composite   | `:missing` `and/or`           |
| URI         | `:missing`                    |
| Number      |                               |

### **Search result params**
**Patientリソースで確認中**
```
_count
_include
_revinclude
_elements
_summary  
```

### **Common search params**
```
_id 
_lastUpdated
_tag
_profile
_security 
```


### **Patient search params**:
```
active 
address
addressCity 
addressCountry
addressPostalcode
addressState
addressUse
birthdate
death_date
deceased
family
gender
general_practitioner
given
identifier
link
name
organization
telecom
```

### **Observation search params**:
```
based_on
category
code
code_value_concept
code_value_date
code_value_quantity
code_value_string
combo_code
combo_code_value_concept
combo_code_value_quantity
combo_data_absent_reason
combo_value_concept
combo_value_quantity
component_code
component_code_value_concept
component_code_value_quantity
component_data_absent_reason
component_value_concept
component_value_quantity
data_absent_reason
date
derived_from
device
encounter
focus
has_member
identifier
method
partof
patient
performer
specimen
status
subject
value_concept
value_date
value_quantity
value_string
 ```

 ### **開発について**:

 #### リソースの追加方法
 以下を確認
- [issues/134](https://github.com/bluehalo/node-fhir-server-mongo/issues/134#event-8450419647)
- [Patient](https://github.com/ryumtym/fhirServer/tree/master/src/services/patient)
- [Observation](https://github.com/ryumtym/fhirServer/tree/master/src/services/observation)

 #### クエリ機能の追加
 以下を確認
- [querybuilder.util](https://github.com/ryumtym/fhirServer/blob/master/src/utils/querybuilder.util.js)