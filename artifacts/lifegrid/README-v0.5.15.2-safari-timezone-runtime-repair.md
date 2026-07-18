# v0.5.15.2 Safari timezone runtime repair

This narrow hotfix removes the residual Grid timezone clock that could pass legacy `displayTimeZone: "local"` into `Intl.DateTimeFormat` and crash Safari startup. Calendar compatibility metadata is now discarded during hydration and backup normalization; Event dates and local HH:MM values remain unchanged.
