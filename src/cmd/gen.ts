import { Logger } from '@nestjs/common';
import { Command, CommandProvider } from 'nestjs-eclih';
import { dumpContext } from '../util/context';
import { GContext } from '../context';
import { loadGenerationConfig, loadDefs } from '../loader';
import { getInstantiatedGenerators } from '../config';
import {
  TypescriptGenerator,
  GraphQLNestjsTsDefGenerator,
  GeneralEntityGenerator,
  GraphQLSchemaGenerator,
  RestNestjsGenerator,
} from '../gen';

// to trigger decorator
TypescriptGenerator;
GraphQLNestjsTsDefGenerator;
GeneralEntityGenerator;
GraphQLSchemaGenerator;
RestNestjsGenerator;

@CommandProvider()
export class GenCmdProvider {
  private readonly logger = new Logger(GenCmdProvider.name);

  @Command({
    nameAndArgs: 'gen',
    options: [
      {
        nameAndArgs: '--config <file>',
        mandatory: true,
      },
    ],
  })
  async gen({ config }) {
    const gConfig = loadGenerationConfig(config);
    const generators = getInstantiatedGenerators(gConfig);
    const defs = await loadDefs(gConfig.defs);
    if (defs.length == 0) {
      throw new Error('no defs found');
    }
    const ctx = new GContext(gConfig);
    defs.forEach((def) => ctx.addTypesFromDef(def));
    generators.forEach((gnrt) => gnrt.generate(ctx, ...defs));
    dumpContext(ctx, '.');
  }
}