## 進捗
- stringsQueryBuilder ,nameQueryBuilder => done <br>
[https://www.hl7.org/fhir/search.html#string]

- dateQueryBuilder -> maybe done

- fhirJsonData for test [https://mongoplayground.net/]
```
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