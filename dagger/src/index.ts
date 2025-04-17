/**
 * Build the Runme VS Code extension end-to-end.
 *
 */

import {
  Platform,
  dag,
  Container,
  File,
  Directory,
  object,
  func,
  ReturnType,
} from '@dagger.io/dagger'
@object()
export class VscodeRunme {
  /**
   * The source to build the extension from.
   */
  @func()
  source?: Directory

  /**
   * The container to build the extension in.
   */
  @func()
  container?: Container

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
   * Get the default platform for the container.
   * @returns The default platform.
   */
  @func()
  defaultPlatform(): Promise<Platform> {
    return dag.defaultPlatform()
  }

  /**
   * Sets up the base container
   * @returns The modified VscodeRunme instance.
   */
  @func()
  async base(): Promise<VscodeRunme> {
    if (this.container) {
      return this
    }

    const containerPlatform = await this.defaultPlatform()
    const binary = dag
      .runmeKernel()
      .releaseFiles(containerPlatform, { version: 'latest' })
      .file('runme')

    this.container = dag
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

    return this
  }

  /**
   * Builds the VSIX extension file.
   * @param runmeBinary - The runme binary to be added to the container.
   * @returns The modified VscodeRunme instance.
   */
  @func()
  async build(runmeBinary: Directory): Promise<VscodeRunme> {
    await this.base()

    this.container = this.container
      .withMountedDirectory('/mnt/vscode-runme/bin', runmeBinary)
      .withExec('runme run setup build'.split(' '))

    return this
  }

  /**
   * Bundles the VSIX extension file.
   * @returns The modified VscodeRunme instance.
   */
  @func()
  async bundle(): Promise<File> {
    await this.base()

    return this.container.withExec('runme run bundle'.split(' ')).file('runme-extension.vsix')
  }

  /**
   * Runs the unit tests.
   * @param runmeBinary - The runme binary to be added to the container.
   * @param debug - Whether to run the tests in debug mode.
   * @param spec - The spec file to run.
   * @returns Returns the container running the tests.
   */
  @func()
  async unitTest(debug = false): Promise<Container> {
    await this.base()

    const expect = debug ? ReturnType.Any : ReturnType.Success

    return this.container.withExec('runme run test:unit'.split(' '), { expect })
  }

  /**
   * Test the extension end-to-end.
   * @param debug - Whether to run the tests in debug mode.
   * @param spec - The spec file to run.
   * @returns Returns the container running the tests.
   */
  @func()
  async e2eTest(debug = false, spec?: string): Promise<Container> {
    await this.base()

    const e2eTestCommand = ['xvfb-run', 'npx wdio run ./tests/e2e/wdio.conf.ts']
    if (spec && spec.length > 0) {
      e2eTestCommand.push(...['--spec ', spec])
    }

    const expect = debug ? ReturnType.Any : ReturnType.Success

    // Run e2e tests exclusively from bundle not source/dependencies
    return this.container
      .withExec('rm -rf node_modules'.split(' '))
      .withExec('rm -rf package*.json'.split(' '))
      .withExec(e2eTestCommand.join(' ').split(' '), { expect })
  }
}
