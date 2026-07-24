import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, Length, Matches } from 'class-validator';
import { trimTransform } from 'src/common/transformers/transformer';

export class CreateTagDto {
  @IsString()
  @IsNotEmpty()
  @Length(1, 50)
  @Transform(trimTransform)
  name!: string;

  @IsOptional()
  @IsString()
  @Matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, {
    message: 'Color must be a valid hex color string (e.g. #FF0000)',
  })
  color?: string;
}
