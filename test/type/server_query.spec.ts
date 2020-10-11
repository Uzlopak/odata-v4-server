import { ODataModel, ODataNavigation, OptionalProperty, UUIDKeyProperty } from '../../src';
import { Class, SchoolEntities } from './school_model';
import { createServerAndClient, createTmpConnection } from './utils';


describe('server query result Test Suite', () => {


  it('should support $orderby', async () => {
    const conn = await createTmpConnection({
      name: 's_query_conn_1',
      entities: SchoolEntities
    });

    const { client, shutdownServer } = await createServerAndClient(conn);

    try {
      const classes = client.getEntitySet<Class>('Classes');
      const c1 = await classes.create({ cid: 1, name: 'c1', desc: 'class1' });
      const c2 = await classes.create({ cid: 2, name: 'c2', desc: 'class2' });
      const r1 = await classes.query(client.newParam().orderby('cid', 'desc'));
      expect(r1.map((item) => item.cid)).toMatchObject([c2.cid, c1.cid]);
      const r2 = await classes.query(client.newParam().orderby('cid', 'asc'));
      expect(r2.map((item) => item.cid)).toMatchObject([c1.cid, c2.cid]);

    } finally {
      await shutdownServer();
    }

  });

  it('should support $orderby multi parameters', async () => {


    @ODataModel()
    class ODBModel {
      @UUIDKeyProperty() key: string;
      @OptionalProperty() c1: number;
      @OptionalProperty() c2: number;
    }

    const conn = await createTmpConnection({
      name: 's_query_conn_2',
      entities: [ODBModel]
    });

    const { client, shutdownServer } = await createServerAndClient(conn);

    try {
      const es = client.getEntitySet<ODBModel>('ODBModels');
      const o1 = await es.create({ c1: 1, c2: 1 });
      const o2 = await es.create({ c1: 1, c2: 2 });
      const o3 = await es.create({ c1: 2, c2: 1 });
      const o4 = await es.create({ c1: 2, c2: 2 });

      const r1 = await es.query(client.newParam().orderbyMulti([
        { field: 'c1', order: 'asc' },
        { field: 'c2', order: 'asc' }
      ]));

      expect(r1.map((item) => item.key)).toMatchObject([
        o1.key,
        o2.key,
        o3.key,
        o4.key
      ]);

      const r2 = await es.query(client.newParam().orderbyMulti([
        { field: 'c1', order: 'asc' },
        { field: 'c2', order: 'desc' }
      ]));

      expect(r2.map((item) => item.key)).toMatchObject([
        o2.key,
        o1.key,
        o4.key,
        o3.key
      ]);

    } finally {
      await shutdownServer();
    }

  });

  it('should support $select parameter', async () => {
    @ODataModel()
    class SelectModel {
      @UUIDKeyProperty() key: string;
      @OptionalProperty() f1: string;
      @OptionalProperty() f2: string;
      @OptionalProperty() f3: string;

      @ODataNavigation({
        type: 'OneToMany',
        entity: () => SelectRefModel,
        targetForeignKey: 'sMId'
      })
      refs: Array<SelectRefModel>


    }

    @ODataModel()
    class SelectRefModel {
      @UUIDKeyProperty() key: string;
      @OptionalProperty() rf1: string;
      @OptionalProperty() rf2: string;
      @OptionalProperty() rf3: string;
      @OptionalProperty() sMId: string;
      @ODataNavigation({
        type: 'ManyToOne',
        entity: () => SelectModel,
        foreignKey: 'sMId'
      })
      sm: SelectModel;
    }


    const conn = await createTmpConnection({
      name: 's_query_conn_3',
      entities: [SelectModel, SelectRefModel]
    });

    const { client, shutdownServer } = await createServerAndClient(conn);

    try {
      const selectModels = client.getEntitySet<SelectModel>('SelectModels');
      const createdItem = await selectModels.create({
        f1: 'v1',
        f2: 'v2',
        f3: 'v3',
        refs: [{
          rf1: 'v1',
          rf2: 'v2',
          rf3: 'v3'
        }]
      });

      const onlyF1Object = await selectModels.retrieve(createdItem.key, client.newParam().select('f1'));
      expect(onlyF1Object).toHaveProperty('f1');
      expect(onlyF1Object).not.toHaveProperty('f2');
      expect(onlyF1Object).not.toHaveProperty('f3');

      const onlyF1ExpandedRF1Object = await selectModels.retrieve(
        createdItem.key,
        client.newParam().expand('refs($select=rf1)').select('f1')
      );

      expect(onlyF1ExpandedRF1Object).toHaveProperty('f1');
      expect(onlyF1ExpandedRF1Object).toHaveProperty('refs');
      expect(onlyF1ExpandedRF1Object).not.toHaveProperty('f2');
      expect(onlyF1ExpandedRF1Object).not.toHaveProperty('f3');
      expect(onlyF1ExpandedRF1Object.refs[0]).toHaveProperty('rf1');
      expect(onlyF1ExpandedRF1Object.refs[0]).not.toHaveProperty('rf2');
      expect(onlyF1ExpandedRF1Object.refs[0]).not.toHaveProperty('rf3');


      const onlyF1Objects = await selectModels.query(client.newParam().select('f1'));
      expect(onlyF1Objects[0]).toHaveProperty('f1');
      expect(onlyF1Objects[0]).not.toHaveProperty('f2');
      expect(onlyF1Objects[0]).not.toHaveProperty('f3');

      const onlyF1ExpandedRF1Objects = await selectModels.query(
        client.newParam().expand('refs($select=rf1)').select('f1')
      );

      expect(onlyF1ExpandedRF1Objects[0]).toHaveProperty('f1');
      expect(onlyF1ExpandedRF1Objects[0]).toHaveProperty('refs');
      expect(onlyF1ExpandedRF1Objects[0]).not.toHaveProperty('f2');
      expect(onlyF1ExpandedRF1Objects[0]).not.toHaveProperty('f3');
      expect(onlyF1ExpandedRF1Objects[0].refs[0]).toHaveProperty('rf1');
      expect(onlyF1ExpandedRF1Objects[0].refs[0]).not.toHaveProperty('rf2');
      expect(onlyF1ExpandedRF1Objects[0].refs[0]).not.toHaveProperty('rf3');

    } finally {
      await shutdownServer();
    }

  });

});
