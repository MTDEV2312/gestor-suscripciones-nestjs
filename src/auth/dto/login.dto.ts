import { Transform } from "class-transformer";
import { IsEmail, IsNotEmpty, IsString } from "class-validator";
import { toLowerCaseTransform, trimTransform } from "src/common/transformers/transformer";

export class LoginDto {
    @Transform(toLowerCaseTransform)
    @Transform(trimTransform)
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @Transform(trimTransform)
    @IsString()
    @IsNotEmpty()
    password: string;
}
