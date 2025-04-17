/* eslint-disable max-len */
/**
 * Build the Runme VS Code extension end-to-end.
 *
 */

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import {
  Platform,
  dag,
  Container,
  File,
  Directory,
  object,
  func,
  Secret,
  ReturnType,
} from '@dagger.io/dagger'
import * as os from 'os'
@object()
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export class VscodeRunme {
  /**
   * The source to build the extension from.
   */
  @func()
  source?: Directory

  /**
   * The presetup script to be added to the container.
   */
  @func()
  presetup?: File

  constructor(source?: Directory) {
    if (!source) {
      source = dag.git('https://github.com/runmedev/vscode-runme.git').tag('main').tree()
    }
    this.source = source
    this.presetup = source.file('dagger/scripts/presetup.sh')
  }

  /**
   * Sets up the container for the VscodeRunme instance.
   * @param binary - Optional kernel binary file to be added to the container.
   * @param presetup - Optional presetup (for dependencies) file to be added to the container.
   * @returns The modified VscodeRunme instance.
   */
  @func()
  container(): Container {
    const arch = os.arch() === 'x64' ? 'amd64' : 'arm64'
    const containerPlatform = `linux/${arch}` as Platform
    const binary = dag
      .runmeKernel()
      .releaseFiles(containerPlatform, { version: 'latest' })
      .file('runme')

    return dag
      .container({ platform: containerPlatform })
      .from('ghcr.io/runmedev/runme-build-env:latest')
      .withEnvVariable('DAGGER_BUILD', '1')
      .withEnvVariable('EXTENSION_NAME', 'runme')
      .withFile('/usr/local/bin/runme', binary)
      .withFile('/usr/local/bin/presetup', this.presetup)
      .withEntrypoint([])
      .withMountedDirectory('/mnt/vscode-runme', this.source)
      .withWorkdir('/mnt/vscode-runme')
      .withExec('bash /usr/local/bin/presetup'.split(' '))
  }

  /**
   * Builds the VSIX extension file.
   * @returns The packaged VSIX extension file.
   */
  @func()
  async build(runmeBinary: Directory): Promise<Container> {
    return this.container()
      .withMountedDirectory('/mnt/vscode-runme/bin', runmeBinary)
      .withExec('runme run setup build'.split(' '))
  }

  /**
   * Bundles the VSIX extension file.
   * @returns The packaged VSIX extension file.
   */
  @func()
  async bundle(runmeBinary: Directory): Promise<File> {
    const build = await this.build(runmeBinary)

    return build.withExec('runme run bundle'.split(' ')).file('runme-extension.vsix')
  }

  /**
   * Test the extension end-to-end.
   */
  @func()
  async test(runmeBinary: Directory, debug = false, spec?: string): Promise<Container> {
    const e2eTestCommand = ['xvfb-run', 'npx wdio run ./tests/e2e/wdio.conf.ts']

    if (spec && spec.length > 0) {
      e2eTestCommand.push(...['--spec ', spec])
    }

    const build = await this.build(runmeBinary)
    const expect = debug ? ReturnType.Any : ReturnType.Success

    return build.withExec(e2eTestCommand.join(' ').split(' '), { expect })
  }
}
