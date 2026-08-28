# Handoff — LifeGrid v0.5.26

## Architecture
The canonical parsed proposal → preflight selection → immutable atomic apply pipeline owns all AI manipulation. External models can propose ADD, UPDATE, MOVE, RESCHEDULE, RECATEGORIZE, HIDE, RESTORE, DETACH, and DELETE operations, but LifeGrid exclusively controls validation, selection, destructive approval, relationship repair, and persistence. No parallel direct-delete path or cloud AI execution was introduced.

## Selection and deletion semantics
Valid additions and updates begin selected; every deletion begins unchecked. Intrinsic proposal errors disable only that proposal. Transaction conflicts are computed only from `selectedRecords`, so an unchecked delete cannot block a selected update. Surviving-record impacts update with the selected deletion set. People and People Schedule deletion are rejected.

## Repairs
Task deletion removes surviving Event links and detaches surviving children. Event deletion removes surviving Task links. Category deletion protects Other, rehomes surviving Events/Tasks, and applies the Other color to Events. Project deletion clears surviving `projectId` references. A recurring delete removes only listed IDs. Visibility/publication flags remain reversible updates.

## Qualification
The correction updates stale startup markers to v0.5.26 / interchange 5 / backup 7, fixes the AI route to `/#ai`, and expands v0.5.26 unit and browser coverage. Local browser installation is blocked by the execution environment's HTTP 403 proxy; hosted CI results must be recorded on PR #50 after push.

## Final convergence correction
The deterministic v0.5.26 browser seed now initializes only an absent store, persistence assertions poll real storage, and the destructive suite has retries disabled. Interactive Grid readers now enforce `showInGrid !== false`, while publication continues to use only `showInExport`. Intrinsic proposal validation is a single linear analysis that recognizes same-patch additions; selected-transaction preflight separately owns live dependency and deletion conflicts. Local qualification is 144/144 units, typecheck, and build green. Hosted browser/Actions results must not be recorded as green until the correction reaches PR #50.
