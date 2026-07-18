import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';
import { trimTransform } from 'src/common/transformers/transformer';

export class PasswordUpdateDto {
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
  password?: string;

  @Transform(trimTransform)
  @IsString()
  @IsNotEmpty()
  repeatPassword?: string;
}
