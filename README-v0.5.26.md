# LifeGrid v0.5.26

Universal AI Interchange v5 is a model-agnostic manipulation interface: an external model may propose **ADD, UPDATE, MOVE, RESCHEDULE, RECATEGORIZE, HIDE, RESTORE, DETACH, and DELETE** operations using stable IDs. LifeGrid never calls or permits an external model to mutate local data directly.

LifeGrid remains the local-first safety boundary. It parses and validates proposals, selects valid non-destructive changes by default, leaves deletions unchecked in a highlighted destructive section, supports individual/subset/bulk deletion approval, shows surviving-record impact, requests final destructive confirmation, and atomically applies only the selected valid transaction.

Event hiding (`showInGrid:false`) and publication exclusion (`showInExport:false`) preserve the record; deletion removes exactly the listed stable ID. Category deletion rehomes surviving records to Other, Project deletion detaches surviving records, and Task/Event deletion repairs canonical links. AI Interchange is 5 and backup schema remains 7.
