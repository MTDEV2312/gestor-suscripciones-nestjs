import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';
import {
  toLowerCaseTransform,
  trimTransform,
} from 'src/common/transformers/transformer';

export class UpdateUserDto {
  @IsOptional()
  @Transform(trimTransform)
  @IsString()
  @IsNotEmpty()
  @Length(3, 20)
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'El username solo puede contener letras, números y guiones bajos',
  })
  username?: string;

  @IsOptional()
  @Transform(toLowerCaseTransform)
  @IsString()
  @IsNotEmpty()
  @IsEmail()
  @MaxLength(50)
  @Transform(trimTransform)
  email?: string;
}
