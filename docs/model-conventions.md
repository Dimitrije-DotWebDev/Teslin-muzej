# GLB model conventions

Status: initial working agreement (version 1)

Ovaj dokument definiše minimalne podatke koje 3D model mora da sadrži kako bi ga aplikacija mogla povezati sa hotspotovima i prikazima magnetnog polja. Konvencija će se proširivati kada uvedemo nove vrste izuma.

## Identitet delova

Svaki objekat koji može da se koristi kao hotspot anchor, hotspot target ili tehnički deo simulacije mora da dobije Blender custom properties koje se nakon GLB izvoza pojavljuju u Three.js `Object3D.userData`.

Obavezno svojstvo:

| Property | Type | Description |
| --- | --- | --- |
| `museumPartId` | string | Stabilan i jedinstven identifikator dela unutar jednog modela. |

Opciona svojstva:

| Property | Type | Description |
| --- | --- | --- |
| `museumRole` | string | Tehnička uloga dela, na primer `rotor`, `stator`, `winding` ili `conductor`. |
| `museumSystemId` | string | Podsistem kome deo pripada, na primer `motor`, `generator` ili `transformer-primary`. |

Primer podataka na jednom objektu:

```json
{
  "museumPartId": "two-phase-motor.motor-winding-01",
  "museumRole": "winding",
  "museumSystemId": "motor"
}
```

`museumPartId` je ugovor sa aplikacijom. Blender naziv objekta može da se promeni bez uticaja na podatke u bazi dok ovaj identifikator ostane isti.

Preporučeni format identifikatora je:

```text
<exhibit>.<system>-<part>-<number>
```

Primeri:

```text
two-phase-motor.motor-winding-01
two-phase-motor.motor-rotor-01
two-phase-motor.generator-stator-01
```

Identifikatori koriste mala slova, cifre, tačku i crticu. Ne sadrže razmake i ne zavise od jezika prikaza.

## Grupe delova

Grupa koja pripada jednom hotspotu ne mora da bude trajno definisana u GLB modelu. Admin panel čuva listu `museumPartId` vrednosti koje pripadaju hotspotu. Na taj način ista grupa može da se menja bez ponovnog izvoza modela.

`museumRole` i `museumSystemId` mogu kasnije pomoći admin panelu da ponudi brzo biranje srodnih objekata, ali ne određuju automatski članstvo u hotspot grupi.

## Hotspot pozicija

Pozicija hotspota se ne čuva u GLB `userData`. Admin panel je čuva u bazi kao lokalnu poziciju u odnosu na izabrani anchor objekat.

Ovim hotspot:

- prati translaciju, rotaciju i skaliranje anchor objekta;
- ostaje vezan za pokretni deo modela;
- može da se pomera bez izmene i ponovnog izvoza GLB fajla.

## Blender priprema i GLB izvoz

- Svaki deo koji treba zasebno birati u admin panelu mora ostati zaseban objekat ili imati zaseban roditeljski objekat sa `museumPartId` vrednošću.
- Custom properties moraju biti uključeni pri glTF/GLB izvozu.
- Transformacije i hijerarhija treba da budu proverene nakon izvoza, naročito za animirane objekte.
- Jedna `museumPartId` vrednost ne sme da se ponovi u istom modelu.
- Brisanje ili zamena identifikatora smatra se promenom ugovora i može prekinuti postojeće hotspot veze.

## Nazivi animacija

Za dvofazni, trofazni, magnetni i elektromagnetni motor koriste se animacije `generator` i `motor`. Generator prvi pokreće magnetno polje, a motor počinje da se okreće nakon kratkog kašnjenja.

Simetrični motor koristi animacije `motor-1` i `motor-2`. Aplikacija započinje sa `motor-1` kao generatorom i `motor-2` kao motorom, a zatim periodično menja njihove uloge. Oba rotora moraju imati zaseban `museumPartId`, a u admin panelu se biraju primarni i sekundarni izvor polja.

Transformator ne zahteva animaciju u GLB modelu. Njegov naizmenični tok se generiše u aplikaciji na osnovu `alternating-core` profila i podešene frekvencije.

## Validacija modela

Pri učitavanju ili zameni modela aplikacija treba da prijavi:

- duplirane `museumPartId` vrednosti;
- hotspot anchor koji više ne postoji;
- hotspot target koji više ne postoji;
- neispravnu ili praznu vrednost obaveznog identifikatora.

Nedostajući target ne treba tiho ignorisati. Admin treba da vidi koji hotspot zahteva popravku pre objavljivanja izuma.

