import * as ts from 'typescript';
import { GConfig } from './config';
import { isPrimitiveType } from './gen/utils';
import { TscaDef, TscaSchema } from './types';

export interface TsFileContext {
  nodes: ts.Node[];

  // import path(from) => a list of import item
  imports: Record<string, TsImport>;
}

export interface TsImport {
  from: string;
  items: string[];
  default?: string;
}

/**
 * Generation Context
 */
export class GContext {
  // relative file path => a list of nodes
  tsFiles: Record<string, TsFileContext>;
  // relative file path => file content
  textFiles: Record<string, string>;
  // all types defined in 'types' of the given tsca defs
  // expected to be initialized before call 'generator.generate(...)'
  // schema name => schema
  types: Record<string, TscaSchema>;

  // generator extension
  genExt: Record<string, unknown>;

  constructor(private readonly gConfig: GConfig) {
    this.tsFiles = {};
    this.textFiles = {};
    this.types = {};
    this.genExt = {};
  }

  addTypesFromDef(def: TscaDef): void {
    def.types.forEach((tySchema) => {
      if (tySchema.name in this.types) {
        throw new Error(`found duplicated type '${tySchema.name}' in 
        '${this.types[tySchema.name].src}'
        '${tySchema.src}'
        `);
      }
      this.types[tySchema.name] = tySchema;
      if (tySchema.enum) {
        this.validateEnum(tySchema);
      }
    });
  }

  validateEnum(schema: TscaSchema) {
    for (const e of schema.enum) {
      if (typeof e.name != 'string') {
        throw new Error(
          `expect enum ${schema.name}'s every enum name to be string`,
        );
      }

      if (typeof e.value != 'number') {
        throw new Error(
          `expect enum ${schema.name}'s every enum value to be number`,
        );
      }

      if (e.value % 1 !== 0) {
        throw new Error(
          `expect enum ${schema.name}'s every enum value to be integer`,
        );
      }
    }
  }

  schemaContainsEnumChild(schema: TscaSchema): boolean {
    if (!schema.properties) {
      return false;
    }

    if (schema.type) {
      return this.isTypeEnum(schema.type);
    }

    if (!!schema.enum) {
      return true;
    }
    for (const prop of schema.properties) {
      if (prop.type == 'array') {
        if (this.isTypeHasEnumChild(prop.items.type)) {
          return true;
        }
      }
      if (prop.type && this.isTypeHasEnumChild(prop.type)) {
        return true;
      }
    }

    return false;
  }
  getTypeSchemaByName(name: string): TscaSchema {
    if (!(name in this.types)) {
      throw new Error(`cannot find type '${JSON.stringify(name)}'`);
    }
    return this.types[name];
  }

  isTypeEnum(name: string): boolean {
    if (isPrimitiveType(name)) {
      return false;
    }
    const schema = this.getTypeSchemaByName(name);
    return !!schema.enum;
  }

  isTypeHasEnumChild(name: string): boolean {
    if (isPrimitiveType(name)) {
      return false;
    }
    const schema = this.getTypeSchemaByName(name);
    return this.schemaContainsEnumChild(schema);
  }

  getOutputByGeneratorId(gId: string) {
    if (!(gId in this.gConfig.generators)) {
      throw new Error(`missing generator '${gId}' in config yaml`);
    }
    return this.gConfig.generators[gId].output;
  }

  addStrToTextFile(file: string, contentToAppend: string): void {
    if (!(file in this.textFiles)) {
      this.textFiles[file] = contentToAppend;
    } else {
      this.textFiles[file] += contentToAppend;
    }
  }

  addNodesToTsFile(file: string, ...nodes: ts.Node[]) {
    if (!(file in this.tsFiles)) {
      this.tsFiles[file] = {
        nodes: [],
        imports: {},
      };
    }

    this.tsFiles[file].nodes.push(...nodes);
  }

  addImportsToTsFile(file: string, ...imports: TsImport[]) {
    if (!(file in this.tsFiles)) {
      this.tsFiles[file] = {
        nodes: [],
        imports: {},
      };
    }

    const fileCtx = this.tsFiles[file];

    const existedImports = fileCtx.imports;
    if (imports) {
      for (const imp of imports) {
        if (!imp.items) {
          continue;
        }
        for (const item of imp.items) {
          if (!(imp.from in existedImports)) {
            existedImports[imp.from] = {
              from: imp.from,
              items: [],
            };
          }
          if (!existedImports[imp.from].items.includes(item)) {
            existedImports[imp.from].items.push(item);
          }
        }

        if (imp.default) {
          existedImports[imp.from].default = imp.default;
        }
      }
    }
  }
}
