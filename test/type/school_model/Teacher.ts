import { lazyRef } from '@newdash/inject';
import { Connection } from 'typeorm';
import { Edm, IncKeyProperty, InjectedTypedService, ODataAction, ODataFunction, ODataModel, ODataNavigation, oInject, OptionalProperty, Property, ResourceNotFoundError } from '../../../src';
import { Class } from './Class';
import { Profile } from './Profile';

class Response {
  @Edm.Decimal
  outNumber: number;
  @Edm.String
  outString: string;
}


@ODataModel()
export class Teacher {

  @IncKeyProperty()
  tid: number;

  @Property()
  name: string;

  @OptionalProperty()
  profileId: number;

  @ODataNavigation({ type: 'OneToOne', entity: () => Profile, foreignKey: 'profileId' })
  profile: Profile;

  @ODataNavigation({ type: 'OneToMany', entity: () => Class, targetForeignKey: 'teacherOneId' })
  classes: Class[];

  // POST http://localhost:50000/Teachers(1)/Default.addClass
  // {
  //  "classId": 1
  // }
  @ODataAction
  async addClass(
    @Edm.ParameterType(Edm.Int32) classId: number,
    @oInject.service(lazyRef(() => Class)) classService: InjectedTypedService<Class>
  ) {
    const c = await classService.findOne(classId);

    if (c === undefined) {
      throw new ResourceNotFoundError(`not found instance class[${classId}]`);
    }

    await classService.update(c.cid, { teacherOneId: this.tid }); // save with hooks lifecycle, suggested
  }

  // GET http://localhost:50000/Teachers(1)/Default.queryClass()
  @ODataFunction
  @Edm.ReturnType(Edm.Collection(Edm.String))
  async queryClass(@oInject.txConnection conn: Connection) {
    const classes = await conn.getRepository(Class).find({
      where: {
        teacherOneId: this.tid
      }
    });

    return classes.map((item) => item.name);
  }

  @ODataFunction
  @Edm.ReturnType(Edm.ComplexType(Response))
  async echo(inNumber: number, inString: string): Promise<any> {
    return {
      outNumber: inNumber,
      outString: inString
    };
  }

}
