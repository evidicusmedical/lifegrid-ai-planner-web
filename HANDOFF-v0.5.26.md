# Handoff — LifeGrid v0.5.26
## Architecture
The canonical parsed proposal → preflight selection → immutable atomic apply pipeline now owns deletion. No parallel direct-delete path was introduced. Selected deletion sets repair references before exactly those stored IDs are removed.
## Semantics
Task deletion removes Event links and detaches surviving children. Event deletion removes Task links. Category deletion protects Other and moves surviving records to Other, recoloring Events. Project deletion uses clear semantics. One recurring occurrence never implies its siblings. Event visibility flags remain reversible updates.
## Qualification
Local unit, typecheck, build, and browser results are recorded in the PR/final delivery. GitHub Actions run ID and Vercel conclusion must be filled from remote checks after push. PR head SHA is the committed head.
