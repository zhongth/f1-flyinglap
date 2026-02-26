export interface Team {
  id: string;
  name: string;
  shortName: string;
  primaryColor: string;
  secondaryColor: string;
  logoPath: string;
  drivers: [string, string];
  constructorOrder: number;
}
