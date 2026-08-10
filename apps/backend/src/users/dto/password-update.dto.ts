import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';
import { trimTransform } from 'src/common/transformers/transformer';

export class PasswordUpdateDto {
  @Transform(trimTransform)
  @IsString()
  @IsNotEmpty({ message: 'La contraseña actual es requerida' })
  currentPassword!: string;

  @Transform(trimTransform)
  @IsString()
  @IsNotEmpty({ message: 'La nueva contraseña es requerida' })
  @Length(8, 16, { message: 'La contraseña debe tener entre 8 y 16 caracteres' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&._-])[A-Za-z\d@$!%*?&._-]+$/,
    {
      message:
        'La contraseña debe tener una mayúscula, una minúscula, un número y un carácter especial',
    },
  )
  newPassword!: string;

  @Transform(trimTransform)
  @IsString()
  @IsNotEmpty({ message: 'Repetir la contraseña es requerido' })
  repeatPassword!: string;
}
