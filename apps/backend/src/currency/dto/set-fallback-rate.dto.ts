import { Transform } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsString, Length, Min } from 'class-validator';
import { trimTransform } from 'src/common/transformers/transformer';

export class SetFallbackRateDto {
  @Transform(trimTransform)
  @IsString()
  @IsNotEmpty()
  @Length(3, 10)
  base_currency!: string;

  @Transform(trimTransform)
  @IsString()
  @IsNotEmpty()
  @Length(3, 10)
  target_currency!: string;

  @IsNumber()
  @Min(0.000001)
  rate!: number;
}
