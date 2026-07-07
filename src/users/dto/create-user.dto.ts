import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';
import {
  toLowerCaseTransform,
  trimTransform,
} from 'src/common/transformers/transformer';

export class CreateUserDto {
  @Transform(trimTransform)
  @IsString()
  @IsNotEmpty()
  @Length(3, 20)
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'El username solo puede contener letras, números y guiones bajos',
  })
  username!: string;

  @Transform(toLowerCaseTransform)
  @IsString()
  @IsNotEmpty()
  @IsEmail()
  @MaxLength(50)
  @Transform(trimTransform)
  email!: string;

  @Transform(trimTransform)
  @IsString()
  @IsNotEmpty()
  @Length(8, 16)
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&._-])[A-Za-z\d@$!%*?&._-]+$/,
    {
      message:
        'La contraseña debe tener una mayúscula, una minúscula, un número y un carácter especial',
    },
  )
  password!: string;

  @Transform(trimTransform)
  @IsString()
  @IsNotEmpty()
  repeatPassword!: string;
}
