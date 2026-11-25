# License of the anatomy atlas assets

Anatomical uses the Z-Anatomy geometry prepared by the Astronaut Health Intelligence
Platform project by Lucas Palhares Barbosa and contributors. The viewer provides its own
lighting, surface appearance, labels and interactive joint poses.

- Asset revision: https://github.com/lucaspalharesbarbosa/astronaut-health-intelligence-platform/tree/53b679287cc618724a175063cb7e8ed0c9587f4d/frontend/web/public/anatomy
- Preparation and verification: https://lucaspalharesbarbosa.github.io/astronaut-health-intelligence-platform/data/anatomy-assets

The files in this folder (`*.glb` and `manifest.json`) are a derived work of the
**Z-Anatomy** atlas ("Human male model"), which is itself based on **BodyParts3D**.

They are distributed under the
**Creative Commons Attribution-ShareAlike 4.0 International license (CC BY-SA 4.0)**.
License text: https://creativecommons.org/licenses/by-sa/4.0/legalcode

This license applies to the assets in this folder only. The application source code of the
Astronaut Health Intelligence Platform keeps its own license (MIT).

## Required attribution

- Z-Anatomy - The libre 3D atlas of anatomy - CC-BY-SA 4.0
  (https://www.z-anatomy.com/ , https://github.com/Z-Anatomy/Models-of-human-anatomy)
- BodyParts3D - The Database Center for Life Science - CC-BY-SA 2.1 Japan

The BodyParts3D archive now also provides its original database directly under CC BY 4.0.
See the [current BodyParts3D license](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html).

Authors listed by the upstream project:

- Kousaku Okubo (BodyParts3D)
- Gauthier Kervyn (design, 3D, anatomy)
- Marcin Zielinski (Blender add-on)
- Lluis Vinent (Unity development)

Z-Anatomy's component credits include "Cranial Nerves and Foramina" by University of
Dundee, CAHID ([CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)) and meshes that
it lists as "Brainder" and "White matter".

The public provenance comparison credits the cortical surface included by Z-Anatomy to
Anderson M. Winkler's [Brain for Blender](https://brainder.org/research/brain-for-blender/),
licensed under [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/).
See the [comparison in the Z-Anatomy source repository](https://github.com/Z-Anatomy/Models-of-human-anatomy/issues/7).

## Source

- File: `Z-Anatomy.zip` (86,734,957 bytes), containing `Z-Anatomy/Startup.blend`
- URL: https://raw.githubusercontent.com/Z-Anatomy/Models-of-human-anatomy/master/Z-Anatomy.zip
- SHA-256: `e029688545627bd0214b269e1063143abb580aad72b2c2445d6d8a9a0d9da736`
- Retrieved: 2026-11-14

## Modifications made by the AHI project

The upstream model was changed. In summary:

- Only the physical anatomical bodies were kept. Text labels, label helper objects, muscle
  origin and insertion maps, reference lines and planes, cross section planes and the objects
  that exist only in the "Bonus collection" were removed.
- Lymph nodes, tonsils, fasciae, bursae, tendon sheaths, ligaments, joint capsules, meninges,
  pleura, peritoneum, ventricles and other cavities, hair, liver segments and the inner white
  matter surface of the cerebrum were left out.
- Vessel, nerve and duct curves were converted to tube meshes with a reduced resolution and a
  minimum radius of 0.55 mm.
- Neutral reference body: no reproductive structure is exported (internal and external genital
  organs, the vessels, nerves and ducts that only serve them, and the urethra), and the external
  genital region of the body surface was removed and closed with a smooth neutral surface that
  blends into the lower abdomen, the perineum and the inner thighs. Reason: not related to any
  monitored metric; neutral reference body.
- About 2,230 source objects were joined into 250 named structures, each one a single mesh.
- Modifiers were applied (subdivision limited to one level), meshes were welded, triangulated,
  decimated (collapse) and shaded smooth. The skin regions were joined into one single layer
  surface and the normals were blended across the region seams.
- The model was moved to a new frame: meters, Y up, facing +Z, feet on y = 0, centered on x = 0
  and z = 0.
- Upstream materials were replaced by one neutral material per tissue class.
- The meshes were exported to glTF binary (GLB), one file per anatomical system, with positions
  snapped to a 1/16384 m grid, normals quantized to 8 bits and meshopt compression.

The full list, the grouping rules and the rebuild instructions are in `docs/anatomy-assets.md`
at the root of the repository. The pipeline is in `frontend/web/scripts/anatomy/`.

## Content excluded for license reasons

Two upstream sources listed by Z-Anatomy use non commercial licenses. Their content is **not**
part of these files:

- "Anatomy of the Inner Ear" by University of Dundee School of Medicine (CC BY-NC-SA 4.0): every
  ear structure was removed (cochlea, vestibule, auditory ossicles, tympanic membrane, auditory
  tube, cochlear and vestibular nerves).
- "Kidney" by Lissie Cowley (CC BY-NC 4.0): the kidney and renal pelvis meshes and the
  intrarenal vessel curves were removed.

The exact object names are recorded in `manifest.json` under `source.excluded`, together with
the reproductive structures left out for the neutral reference body.

## Content that does not come from Z-Anatomy

The structures `kidney-left` and `kidney-right` (marked `"origin": "ahi-procedural"` in
`manifest.json`) are generated by the AHI project's own procedural geometry code. Only the
bounding box (position and size) of the corresponding Z-Anatomy kidney was used to place them;
no upstream kidney geometry was used. They are distributed here under the same CC BY-SA 4.0
license as the rest of the folder.

## Notice

This is a single reference model (adult male source, made neutral as described above), used as
reference anatomy only. It is not a scan
of any person and it is not a medical device.
