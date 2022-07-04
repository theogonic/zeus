import {
  ArgumentMetadata,
  HttpStatus,
  Injectable,
  Optional,
  ParseIntPipeOptions,
  PipeTransform,
} from '@nestjs/common';
import {
  ErrorHttpStatusCode,
  HttpErrorByCode,
} from '@nestjs/common/utils/http-error-by-code.util';

@Injectable()
export class ZeusParseIntPipe implements PipeTransform<string> {
  protected exceptionFactory: (error: string) => any;

  constructor(
    @Optional() private options?: ParseIntPipeOptions & { optional?: boolean },
  ) {
    options = options || {};
    const { exceptionFactory, errorHttpStatusCode = HttpStatus.BAD_REQUEST } =
      options;

    this.exceptionFactory =
      exceptionFactory ||
      ((error) => new HttpErrorByCode[errorHttpStatusCode](error));
  }

  async transform(value: string, metadata: ArgumentMetadata): Promise<number> {
    if (this.options.optional && value == null) {
      return null;
    }
    if (!this.isNumeric(value)) {
      throw this.exceptionFactory(
        'Validation failed (numeric string is expected)',
      );
    }
    return parseInt(value, 10);
  }

  protected isNumeric(value: string): boolean {
    return (
      ['string', 'number'].includes(typeof value) &&
      /^-?\d+$/.test(value) &&
      isFinite(value as any)
    );
  }
}

export interface ParseBoolPipeOptions {
  errorHttpStatusCode?: ErrorHttpStatusCode;
  exceptionFactory?: (error: string) => any;
  optional?: boolean;
}

@Injectable()
export class ZeusParseBoolPipe
  implements PipeTransform<string | boolean, Promise<boolean>>
{
  protected exceptionFactory: (error: string) => any;

  constructor(@Optional() private options?: ParseBoolPipeOptions) {
    options = options || {};
    const { exceptionFactory, errorHttpStatusCode = HttpStatus.BAD_REQUEST } =
      options;
    this.exceptionFactory =
      exceptionFactory ||
      ((error) => new HttpErrorByCode[errorHttpStatusCode](error));
  }

  async transform(
    value: string | boolean,
    metadata: ArgumentMetadata,
  ): Promise<boolean> {
    if (this.options.optional && value == null) {
      return null;
    }
    if (this.isTrue(value)) {
      return true;
    }
    if (this.isFalse(value)) {
      return false;
    }
    throw this.exceptionFactory(
      'Validation failed (boolean string is expected)',
    );
  }

  protected isTrue(value: string | boolean): boolean {
    return value === true || value === 'true';
  }

  /**
   * @param value currently processed route argument
   * @returns `true` if `value` is said 'false', ie., if it is equal to the boolean
   * `false` or the string `"false"`
   */
  protected isFalse(value: string | boolean): boolean {
    return value === false || value === 'false';
  }
}
