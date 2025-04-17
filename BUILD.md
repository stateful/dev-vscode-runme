---
runme:
  id: 01JMMSSHXM7N70W4KCJ5XGEE2A
  version: v3
shell: dagger shell
terminalRows: 20
---

# Build the Runme VS Code extension (via Dagger)

Initialize the VscodeRunme Dagger module using the local source code.

```sh {"name":"VscodeRunme"}
### Exported in runme.dev as VscodeRunme
. --source .
```

## Pick pre-built Runme kernel binary

The VS Code extension wraps the Runme kernel binary (platform-specific). Let's use the host's platform.

```sh {"interpreter":"zsh","name":"Target","promptEnv":"never","terminalRows":"3"}
### Exported in runme.dev as Target
direnv allow
echo "Building for $TARGET_PLATFORM"
```

If the target platform is not set, reset your Runme session. It's likely that direnv wasn't authorized yet.

The external Dagger module `runme` is linked inside `vscode-runme` dagger.json. This makes it available as `runme` in the current module's scope.

```sh {"terminalRows":"14"}
RunmeKernel | release --version latest | entries
```

The previous command will list all the available platforms per version. Let's pick the latest version matching the host's platform (i.e. `$TARGET_PLATFORM`).

```sh {"id":"01JMMSSHXM7N70W4KCHTX92MHE","name":"KernelBinary","terminalRows":"27"}
### Exported in runme.dev as KernelBinary
RunmeKernel | release-files --version latest $TARGET_PLATFORM
```

## Build the Runme VS Code Extension

Let's tie together above's artifacts via their respective cell names to build the Runme VS Code extension.

```sh {"id":"01JMMSSHXM7N70W4KCJ1N0DVXG","name":"Extension","terminalRows":"15"}
### Exported in runme.dev as Extension
VscodeRunme | build $(KernelBinary)
```

Export the extension to a VSIX file.

```sh {"interpreter":"bash","terminalRows":"3"}
echo "Exporting extension to $EXTENSION_VSIX"
```

```sh {"name":"ExtensionVsix"}
### Exported in runme.dev as ExtensionVsix
Extension | export $EXTENSION_VSIX
```

## Testing

```sh {"terminalRows":"35"}
. --source . | test --debug $(KernelBinary) | directory "tests/e2e/logs" | export /tmp/e2e-logs
```

```sh
. --source . | test $(KernelBinary) | stdout
```
