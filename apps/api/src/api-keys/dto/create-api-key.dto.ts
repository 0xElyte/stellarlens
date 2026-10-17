import { IsOptional, IsString, In } from "class-validator";

export class CreateApiKeyDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @In["full", "read"]()
  scope?: "full" | "read";
}
