import { IsOptional, IsString } from "class-validator";

export class UpdateContractDto {
  @IsOptional()
  @IsString()
  name?: string | null;
}
