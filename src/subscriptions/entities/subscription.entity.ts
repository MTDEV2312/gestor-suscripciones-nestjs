import { User } from "src/users/entities/user.entity";
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

@Entity()

export class Subscription {

    @PrimaryGeneratedColumn('uuid')
    id:string;

    @Column({
        type:'varchar',
        length:100,
        nullable:false,
        comment:'nombre de la suscripcion'
    })
    name:string;

    @Column({
        type:'int',
        nullable:false,
        comment:'precio de la suscripcion'
    })
    price:number;

    @Column({
        type:'varchar',
        length:10,
        nullable:false,
        comment:'moneda de la suscripcion'
    })
    currency:string;

    @Column({
        type:'simple-enum',
        enum:['MONTHLY','YEARLY'],
        nullable:false,
        comment:'frecuencia de la suscripcion'
    })
    frecuency: 'MONTHLY' | 'YEARLY';

    @CreateDateColumn({
        type:'date',
        nullable:false,
        comment:'fecha de renovacion de la suscripcion'
    })
    renovation_date:Date;

    @Column({
        type:'boolean',
        nullable:false,
        comment:'estado de la suscripcion'
    })
    is_active:boolean;

    @Column({
        type:'varchar',
        length:50,
        nullable:false,
        comment:'usuario al que pertenece la suscripcion'
    })
    user_id:string;

    @CreateDateColumn({
        type:'datetime',
        comment:'fecha de creacion de la suscripcion'
    })
    created_at:Date;

    @CreateDateColumn({
        type:'datetime',
        comment:'fecha de actualizacion de la suscripcion'
    })
    updated_at:Date;

    @ManyToOne(() => User, (user) => user.subscriptions)
    @JoinColumn({name:'user_id'})
    user:User;
}
