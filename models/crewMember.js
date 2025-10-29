const db = require('../util/database');

module.exports = class CrewMembers {
    constructor(id, crew_id, professional_id) {
        this.id = id;
        this.crew_id = crew_id;
        this.professional_id = professional_id;
    }

    
    static getAll() {
        return db.execute('select * from crew_members cm, crews c where cm.id = c.id');
    }

    // Método para crear un nuevo crew
    static create(crew_id, professional_id) {
        return db.execute(
            'INSERT INTO crew_members (crew_id, professional_id) VALUES (?, ?)',
            [crew_id, professional_id]
        ); 
    }

    static update(id,crew_id, professional_id) {
        // Verifica si algún campo está vacío o no definido
        console.log('crew_id:', id);
        console.log('crew_id:', crew_id);
        console.log('Proffesional_id:', professional_id);
    
        if (!crew_id || !professional_id ) {
            throw new Error('Todos los campos deben ser proporcionados.');
        }
    
        return db.execute(
            `UPDATE crew_members
             SET crew_id = ?, professional_id = ?
             WHERE id = ?`,
            [crew_id,professional_id,id]
        );
    }
    

    static async getAllByCrewCode() {
        const [rows] = await db.execute(
            `select crew_code from crew_members cm, crews c where cm.id = c.id`,);
        return rows[0]; 
    }

};