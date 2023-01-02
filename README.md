```
npm start
```

## Select deletable rules

```
var versionManager = await import('http://127.0.0.1:8080/index.js?' + Date.now());
versionManager.selectRules()
```

Review selected rule in `ALL RULES` table. You may need to scroll down to the bottom of this table to review all selected items.

## Delete selected rules

```
versionManager.deleteRules()
```

## Select deletable versions

```
versionManager.selectVersions()
```

## Delete selected versions

```
versionManager.deleteVersions()
```