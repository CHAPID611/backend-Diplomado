import { IsString, IsNotEmpty, IsDateString } from 'class-validator';

export class CreateNoveltyDto {
  @IsNotEmpty()
  @IsString()
  novelty: string;

  @IsNotEmpty()
  @IsDateString()
  noveltyDate: string;

  @IsNotEmpty()
  @IsString()
  description: string;
} 