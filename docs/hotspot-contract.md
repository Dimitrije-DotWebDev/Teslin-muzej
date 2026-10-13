# Hotspot data contract

Status: initial working agreement (version 1)

Hotspot sadržaj, pozicija i izbor delova čuvaju se van GLB modela. Lokalna konfiguracija u trenutnom frontendu privremeno predstavlja podatke koje će kasnije vraćati ASP.NET Core API.

## API representation

```json
{
  "id": "c078662a-86f8-4592-b2a1-2e9be631f401",
  "title": "Намотаји мотора",
  "description": "Намотаји стварају обртно магнетно поље.",
  "anchorPartId": "two-phase-motor.motor-winding-01",
  "localPosition": {
    "x": 0.25,
    "y": 0.8,
    "z": 0.1
  },
  "targetPartIds": [
    "two-phase-motor.motor-winding-01",
    "two-phase-motor.motor-winding-02",
    "two-phase-motor.motor-winding-03",
    "two-phase-motor.motor-winding-04",
    "two-phase-motor.motor-winding-05",
    "two-phase-motor.motor-winding-06",
    "two-phase-motor.motor-winding-07",
    "two-phase-motor.motor-winding-08"
  ],
  "isEnabled": true,
  "displayOrder": 0
}
```

## Fields

| Field | Required | Description |
| --- | --- | --- |
| `id` | yes | Stabilan hotspot identifikator. Backend koristi GUID. |
| `title` | yes | Naslov koji se prikazuje posetiocu. |
| `description` | yes | Tekst panela. U prvoj verziji koristi običan tekst. |
| `anchorPartId` | yes | `museumPartId` objekta u čijem koordinatnom sistemu je sačuvana pozicija. |
| `localPosition` | yes | Lokalna Three.js pozicija početka linije (`x`, `y`, `z`). |
| `targetPartIds` | yes | Jedan ili više delova koji reaguju na hover/klik i zajedno dobijaju glow. |
| `isEnabled` | yes | Omogućava privremeno skrivanje hotspota bez brisanja. |
| `displayOrder` | yes | Stabilan redosled u admin listi i budućim alternativnim prikazima. |

## Invariants

- `title` ne sme biti prazan.
- `description` ne sme biti prazan u objavljenom izumu.
- `anchorPartId` mora postojati u trenutno povezanom modelu.
- `targetPartIds` mora sadržati najmanje jednu jedinstvenu vrednost.
- Svaki target mora postojati u trenutno povezanom modelu.
- `localPosition` mora sadržati konačne brojeve; `NaN` i beskonačne vrednosti nisu dozvoljene.
- Anchor može, ali ne mora, da bude član `targetPartIds` liste.

## Runtime behavior

- Hover nad bilo kojim target delom aktivira isti hotspot.
- Svi target delovi dobijaju zajedničku glow animaciju.
- Linija počinje na `localPosition` tački anchor objekta i prati njegove transformacije.
- Klik zadržava panel otvorenim.
- Dugme za zatvaranje i taster Escape zatvaraju panel.
- Samo jedan hotspot može biti trajno otvoren u istom trenutku.

## Admin editing flow

1. Admin bira izum i učitava njegov GLB model.
2. Frontend indeksira objekte prema `userData.museumPartId` vrednosti.
3. Klikom na model admin bira anchor i lokalnu poziciju.
4. Admin bira jedan ili više target delova.
5. Unosi naslov i opis, pa čuva hotspot.
6. Pre objavljivanja backend i frontend proveravaju da svi navedeni delovi postoje u modelu.

## Persistence model

Početni domenski model može imati:

- `Exhibit` kao vlasnika modela i hotspotova;
- `Hotspot` sa sadržajem, anchor podatkom i lokalnom pozicijom;
- `HotspotTarget` kao vezu između hotspota i jednog `museumPartId` identifikatora.

Konačan EF Core mapping dogovorićemo kada budemo pravili backend. API ugovor ne treba da zavisi od toga da li se targeti u SQLite bazi čuvaju u posebnoj tabeli ili drugim internim oblikom.

## Versioning

Ovo je verzija 1 ugovora. Nova opciona polja možemo dodavati bez menjanja postojeće strukture. Promena značenja `anchorPartId`, koordinatnog sistema ili `targetPartIds` zahteva novu verziju ugovora i migraciju postojećih podataka.

