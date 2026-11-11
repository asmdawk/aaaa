# Driver hands

The left and right anatomical hand meshes are the generic-hand assets from [WebXR Input Profiles](https://github.com/immersive-web/webxr-input-profiles), package `@webxr-input-profiles/assets@1.0`.

Source assets:
- https://cdn.jsdelivr.net/npm/@webxr-input-profiles/assets@1.0/dist/profiles/generic-hand/left.glb
- https://cdn.jsdelivr.net/npm/@webxr-input-profiles/assets@1.0/dist/profiles/generic-hand/right.glb

The package's assets README states that assets are available under the MIT license. Copyright (c) 2019 Amazon. Full license: `HAND-LICENSE.md`.

Adaptations in this project: coordinates recentered to wrists; tracking joints rebuilt into finger chains; skin shader, nail accents, sleeve/forearm geometry and scripted steering grasp/reach added. Each source hand contains 1,360 vertices and 25 tracked joints. These are shaped anatomical hand meshes, not a photogrammetry scan. Animation is a scripted presentation rig rather than motion capture, collision-driven grasping, or a simulation of human biomechanics.
