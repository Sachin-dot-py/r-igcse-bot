export namespace ChemInfo {
    export interface APIResponse {
        PC_Compounds: PCCompound[];
    }
      
    export interface PCCompound {
        id: PCCompoundID;
        atoms: Atoms;
        bonds: Bonds;
        coords: Coord[];
        charge: number;
        props: Prop[];
        count: Count;
    }
      
    export interface Atoms {
        aid: number[];
        element: number[];
    }
      
    export interface Bonds {
        aid1: number[];
        aid2: number[];
        order: number[];
    }
      
    export interface Coord {
        type: number[];
        aid: number[];
        conformers: Conformer[];
    }
      
    export interface Conformer {
        x: number[];
        y: number[];
    }
      
    export interface Count {
        heavy_atom: number;
        atom_chiral: number;
        atom_chiral_def: number;
        atom_chiral_undef: number;
        bond_chiral: number;
        bond_chiral_def: number;
        bond_chiral_undef: number;
        isotope_atom: number;
        covalent_unit: number;
        tautomers: number;
    }
      
    export interface PCCompoundID {
        id: IDID;
    }
      
    export interface IDID {
        cid: number;
    }
      
    export interface Prop {
        urn: Urn;
        value: Value;
    }
      
    export interface Urn {
        label: string;
        name?: string;
        datatype: number;
        release: string;
        implementation?: string;
        version?: string;
        software?: string;
        source?: string;
        parameters?: string;
    }
      
    export interface Value {
        ival?: number;
        fval?: number;
        binary?: string;
        sval?: string;
    }
      
    export interface APIErrorResponse {
        Fault: Fault;
    }
      
    export interface Fault {
        Code: string;
        Message: string;
        Details: string[];
    }
}