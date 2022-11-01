# https://gist.github.com/ryumtym/6b00d180652144473bf978428ef7883a

**Search result params**
| Summary     | modif :heavy_check_mark:| example                                             |
| :------     | :--                     | :--                                                 |
| _count      |                         | ?_count=20                                          |
| _include    |                         | ?_include=Patient:general-practitioner:Practitioner |
| _revinclude |                         | _revinclude=Observation:subject                     |
| _elements   |                         | ?_elements=-identifier,name                         |

**[Common search params](https://hl7.org/fhir/search.html#all)**
| Summary     | modif :heavy_check_mark:| example             |
| :------     | :--                     | :--                 |
| _id         |                         | ?_id=12345          |
| _lastUpdated| `eq` `gt` `lt`          | ?_lastUpdated=2021  |


**[Patient search params](http://hl7.org/fhir/patient.html#search)**
| Summary     | modif :heavy_check_mark:| example                                   |
| :------     | :--                     | :--                                       |
| active      |`:not`                   | ?active:not=true                          |
| address     | `:contains` `:exact`    | ?address:contains=ja                      |
| address.City| `:contains` `:exact`    | ?address-city=PleasantVille               |
| birthDate   | `eq` `gt` `lt`          | ?birthdate=gt2001&birthdate=lt2022-06-12  |
| deathDate   | `eq` `gt` `lt`          | ?death-date=2015-01-01T00:00:00+00:00     |
| deceased    | `:not`                  | ?deceased:not=true                        |
| gender      | `:not`                  | ?gender:not=unknown                       |
| general_practitioner|                 |                                           |
| identifier  | `:text`                 | ?identifier=example.com|example           |
| link        |                         | ?link=pat2                                |
| name        | `:contains` `:exact`    | ?name:exact=thebausffs                    |
| name.family | `:contains` `:exact`    | ?family=chiang                            |
| name.given  | `:contains` `:exact`    | ?given=ted                                |
| organization|                         | ?organization=1                           |
| telecom     |                         | ?telecom=phone\|070-1234-5678             |



## 進捗

[https://www.hl7.org/fhir/search.html#string]

- memo: dateQuery ``sa,eb,ap``に関してはhapifhirでも使われていないので優先度低 [https://www.hl7.org/fhir/search.html#string]
- 2022/09/01 [fhir_crud#update](https://hl7.org/fhir/http.html#update)
  - update時にreq.bodyに``id``が無い際のエラー処理追加(要コード変更)
  - update時に指定されたオブジェクト全体を上書きするよう変更　


_**fhirJsonData for**_ [mongoplayground](https://mongoplayground.net/)
```bson
[
  {
    _id: "pat1",
    id: "pat1",
    active: true,
    contact: [
      {
        relationship: [
          {
            coding: [
              {
                system: "http://terminology.hl7.org/CodeSystem/v2-0131",
                code: "E"
              }
            ]
          }
        ],
        organization: {
          reference: "Organization/1",
          display: "Walt Disney Corporation"
        }
      }
    ],
    gender: "male",
    identifier: [
      {
        use: "usual",
        type: {
          coding: [
            {
              system: "http://terminology.hl7.org/CodeSystem/v2-0203",
              code: "MR"
            }
          ]
        },
        system: "urn:oid:0.1.2.3.4.5.6.7",
        value: "654321"
      }
    ],
    link: [
      {
        other: {
          reference: "Patient/pat2"
        },
        type: "seealso"
      }
    ],
    managingOrganization: {
      reference: "Organization/1",
      display: "ACME Healthcare, Inc"
    },
    meta: {
      versionId: "2",
      lastUpdated: "2022-06-28T05:39:52+00:00"
    },
    name: [
      {
        use: "official",
        family: "Donald",
        given: [
          "Duck"
        ]
      }
    ],
    photo: [
      {
        contentType: "image/gif",
        data: "R0lGODlhEwARAPcAAAAAAAAA/+9aAO+1AP/WAP/eAP/eCP/eEP/eGP/nAP/nCP/nEP/nIf/nKf/nUv/nWv/vAP/vCP/vEP/vGP/vIf/vKf/vMf/vOf/vWv/vY//va//vjP/3c//3lP/3nP//tf//vf///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////yH5BAEAAAEALAAAAAATABEAAAi+AAMIDDCgYMGBCBMSvMCQ4QCFCQcwDBGCA4cLDyEGECDxAoAQHjxwyKhQAMeGIUOSJJjRpIAGDS5wCDly4AALFlYOgHlBwwOSNydM0AmzwYGjBi8IHWoTgQYORg8QIGDAwAKhESI8HIDgwQaRDI1WXXAhK9MBBzZ8/XDxQoUFZC9IiCBh6wEHGz6IbNuwQoSpWxEgyLCXL8O/gAnylNlW6AUEBRIL7Og3KwQIiCXb9HsZQoIEUzUjNEiaNMKAAAA7"
      }
    ],
    resourceType: "Patient",
    
  },
  {
    _id: "xcda",
    id: "xcda",
    active: true,
    birthDate: "1932-09-24",
    gender: "male",
    identifier: [
      {
        use: "usual",
        type: {
          coding: [
            {
              system: "http://terminology.hl7.org/CodeSystem/v2-0203",
              code: "MR"
            }
          ]
        },
        system: "urn:oid:2.16.840.1.113883.19.5",
        value: "1234567890"
      }
    ],
    managingOrganization: {
      reference: "Organization/2.16.840.1.113883.19.5",
      display: "Good Health Clinic"
    },
    meta: {
      versionId: "1",
      lastUpdated: "2022-06-21T04:32:02+00:00"
    },
    name: [
      {
        family: "Levin",
        given: [
          "Henry"
        ]
      }
    ],
    resourceType: "Patient",
    
  }
]
```