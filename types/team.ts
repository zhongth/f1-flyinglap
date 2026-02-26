export interface Team {
  id: string;
  name: string;
  shortName: string;
  primaryColor: string;
  secondaryColor: string;
  logoPath: string;
  bgImagePath?: string;
  drivers: [string, string];
  constructorOrder: number;
}
