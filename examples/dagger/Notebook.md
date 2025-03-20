---
terminalRows: 20
---

# Runme ▶️ for Dagger

```sh {"excludeFromRunAll":"true","id":"01J097BHJHQS28M29YR0WCZ3B8","interactive":"false"}
curl -s "https://framerusercontent.com/images/tpJEZ337KKxXU4q1SSUXDx4FG4.png?scale-down-to=512"
```

Showcase the notebook experience to **author, debug, express, and run** Dagger pipelines. Both with Dagger Shell and Call (CLI).

## Build the Runme binary using `dagger shell`

```sh {"terminalRows":"3"}
export GOARCH=$(go env GOARCH)
export GOOS=$(go env GOOS)
echo "Building Runme binary for $GOOS/$GOARCH"
```

```sh {"interpreter":"dagger shell","name":"Version"}
### Exported in runme.dev as Version
git github.com/stateful/runme | tag v3.12.2 | tree
```

```sh {"interpreter":"dagger shell","name":"ExportBinary"}
### Exported in runme.dev as ExportBinary
github.com/purpleclay/daggerverse/golang $(Version) |
    build --arch $GOARCH --os $GOOS |
    file runme |
    export runme-binary
```

### Now let the 🐮 cow speak

```sh {"interpreter":"dagger shell"}
github.com/shykes/dagger/modules/wolfi@6124f75ef216c8c61e9f36bd6feb2a96047a9051 |
    container --packages=cowsay |
    with-exec "cowsay","hi from Runme!" |
    stdout
```

## In Comparison build the Runme binary using `dagger call`

```sh {"id":"01HZSMYF33TFKMEVRX5P64BNTB","interactive":"true"}
dagger call \
    -m github.com/purpleclay/daggerverse/golang@v0.3.0 \
    --src "https://github.com/stateful/runme#v3.12.2" \
    build \
        --arch $(go env GOARCH) \
        --os $(go env GOOS) \
    file \
        --path runme \
        --output runme-binary
```

### What does the 🐮 cow say using `dagger call`?

```sh {"id":"01J022WD7Z6TM1QQ075X09BTK4","interactive":"true"}
dagger call \
    -m github.com/shykes/dagger/modules/wolfi@6124f75ef216c8c61e9f36bd6feb2a96047a9051 \
    container \
        --packages=cowsay \
    with-exec --args="cowsay","hi there!" \
    stdout
```
