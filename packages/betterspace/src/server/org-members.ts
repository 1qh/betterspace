import type { Identity, Timestamp } from 'spacetimedb'
import type { ReducerExport, TypeBuilder } from 'spacetimedb/server'

import { identityEquals, makeError } from './reducer-utils'

interface OrgMemberPkLike<Row, Id> {
  delete: (id: Id) => boolean
  find: (id: Id) => null | Row
  update: (row: Row) => Row
}

interface OrgMemberReducersConfig<
  DB,
  OrgId,
  MemberId,
  UserId,
  OrgRow extends OrgRowLike<OrgId>,
  MemberRow extends OrgMemberRowLike<MemberId, OrgId>
> {
  builders: {
    isAdmin: TypeBuilder<boolean, unknown>
    memberId: TypeBuilder<MemberId, unknown>
    newOwnerId: TypeBuilder<UserId, unknown>
    orgId: TypeBuilder<OrgId, unknown>
  }
  orgMemberPk: (table: OrgMemberTableLike<MemberRow>) => OrgMemberPkLike<MemberRow, MemberId>
  orgMemberTable: (db: DB) => OrgMemberTableLike<MemberRow>
  orgPk: (table: Iterable<OrgRow>) => OrgPkLike<OrgRow, OrgId>
  orgTable: (db: DB) => Iterable<OrgRow>
}

interface OrgMemberReducersExports {
  exports: Record<string, ReducerExport<never, never>>
}

interface OrgMemberRowLike<MemberId, OrgId> {
  id: MemberId
  isAdmin: boolean
  orgId: OrgId
  updatedAt: Timestamp
  userId: Identity
}

interface OrgMemberTableLike<Row> extends Iterable<Row> {
  delete: (row: Row) => boolean
  insert: (row: Row) => Row
}

interface OrgPkLike<Row, Id> {
  delete: (id: Id) => boolean
  find: (id: Id) => null | Row
  update: (row: Row) => Row
}

type OrgRole = 'admin' | 'member' | 'owner'

interface OrgRowLike<OrgId> {
  id: OrgId
  updatedAt: Timestamp
  userId: Identity
}

const findOrgMember = <OrgId, MemberId, MemberRow extends OrgMemberRowLike<MemberId, OrgId>>(
    orgMemberTable: Iterable<MemberRow>,
    orgId: OrgId,
    userId: Identity
  ): MemberRow | null => {
    for (const member of orgMemberTable)
      if (Object.is(member.orgId, orgId) && identityEquals(member.userId, userId)) return member
    return null
  },
  getRole = <OrgId, MemberId>(
    org: OrgRowLike<OrgId>,
    member: null | OrgMemberRowLike<MemberId, OrgId>,
    sender: Identity
  ): null | OrgRole => {
    if (identityEquals(org.userId, sender)) return 'owner'
    if (!member) return null
    if (member.isAdmin) return 'admin'
    return 'member'
  },
  requireRole = <OrgId, MemberId>({
    minRole,
    operation,
    org,
    orgMemberTable,
    sender,
    tableName
  }: {
    minRole: 'admin' | 'owner'
    operation: string
    org: OrgRowLike<OrgId>
    orgMemberTable: Iterable<OrgMemberRowLike<MemberId, OrgId>>
    sender: Identity
    tableName: string
  }): OrgRole => {
    const member = findOrgMember(orgMemberTable, org.id, sender),
      role = getRole(org, member, sender)
    if (!role) throw makeError('NOT_ORG_MEMBER', `${tableName}:${operation}`)
    if (minRole === 'owner' && role !== 'owner') throw makeError('FORBIDDEN', `${tableName}:${operation}`)
    if (minRole === 'admin' && role === 'member') throw makeError('FORBIDDEN', `${tableName}:${operation}`)
    return role
  },
  makeMemberReducers = <
    DB,
    OrgId,
    MemberId,
    UserId,
    OrgRow extends OrgRowLike<OrgId>,
    MemberRow extends OrgMemberRowLike<MemberId, OrgId>
  >(
    spacetimedb: {
      reducer: (
        opts: { name: string },
        params: Record<string, TypeBuilder<unknown, unknown>>,
        fn: (ctx: { db: DB; sender: Identity; timestamp: Timestamp }, args: Record<string, unknown>) => void
      ) => ReducerExport<never, never>
    },
    config: OrgMemberReducersConfig<DB, OrgId, MemberId, UserId, OrgRow, MemberRow>
  ): OrgMemberReducersExports => {
    const setAdminReducer = spacetimedb.reducer(
        { name: 'org_set_admin' },
        { isAdmin: config.builders.isAdmin, memberId: config.builders.memberId },
        (ctx, args: { isAdmin: boolean; memberId: MemberId }) => {
          const orgTable = config.orgTable(ctx.db),
            orgPk = config.orgPk(orgTable),
            orgMemberTable = config.orgMemberTable(ctx.db),
            orgMemberPk = config.orgMemberPk(orgMemberTable),
            member = orgMemberPk.find(args.memberId)

          if (!member) throw makeError('NOT_FOUND', 'org:set_admin')
          const org = orgPk.find(member.orgId)
          if (!org) throw makeError('NOT_FOUND', 'org:set_admin')

          requireRole({
            minRole: 'owner',
            operation: 'set_admin',
            org,
            orgMemberTable,
            sender: ctx.sender,
            tableName: 'org'
          })

          if (identityEquals(member.userId, org.userId)) throw makeError('CANNOT_MODIFY_OWNER', 'org:set_admin')

          orgMemberPk.update({
            ...(member as unknown as Record<string, unknown>),
            isAdmin: args.isAdmin,
            updatedAt: ctx.timestamp
          } as MemberRow)
        }
      ),
      removeMemberReducer = spacetimedb.reducer(
        { name: 'org_remove_member' },
        { memberId: config.builders.memberId },
        (ctx, args: { memberId: MemberId }) => {
          const orgTable = config.orgTable(ctx.db),
            orgPk = config.orgPk(orgTable),
            orgMemberTable = config.orgMemberTable(ctx.db),
            orgMemberPk = config.orgMemberPk(orgMemberTable),
            member = orgMemberPk.find(args.memberId)

          if (!member) throw makeError('NOT_FOUND', 'org:remove_member')
          const org = orgPk.find(member.orgId)
          if (!org) throw makeError('NOT_FOUND', 'org:remove_member')
          if (identityEquals(member.userId, org.userId)) throw makeError('CANNOT_MODIFY_OWNER', 'org:remove_member')

          const actorRole = requireRole({
            minRole: 'admin',
            operation: 'remove_member',
            org,
            orgMemberTable,
            sender: ctx.sender,
            tableName: 'org'
          })

          if (actorRole === 'admin' && member.isAdmin) throw makeError('CANNOT_MODIFY_ADMIN', 'org:remove_member')

          const removed = orgMemberPk.delete(args.memberId)
          if (!removed) throw makeError('NOT_FOUND', 'org:remove_member')
        }
      ),
      leaveReducer = spacetimedb.reducer(
        { name: 'org_leave' },
        { orgId: config.builders.orgId },
        (ctx, args: { orgId: OrgId }) => {
          const orgTable = config.orgTable(ctx.db),
            orgPk = config.orgPk(orgTable),
            orgMemberTable = config.orgMemberTable(ctx.db),
            orgMemberPk = config.orgMemberPk(orgMemberTable),
            org = orgPk.find(args.orgId)

          if (!org) throw makeError('NOT_FOUND', 'org:leave')
          if (identityEquals(org.userId, ctx.sender)) throw makeError('MUST_TRANSFER_OWNERSHIP', 'org:leave')

          const member = findOrgMember(orgMemberTable, args.orgId, ctx.sender)
          if (!member) throw makeError('NOT_ORG_MEMBER', 'org:leave')
          const removed = orgMemberPk.delete(member.id)
          if (!removed) throw makeError('NOT_FOUND', 'org:leave')
        }
      ),
      transferOwnershipReducer = spacetimedb.reducer(
        { name: 'org_transfer_ownership' },
        {
          newOwnerId: config.builders.newOwnerId,
          orgId: config.builders.orgId
        },
        (ctx, args: { newOwnerId: UserId; orgId: OrgId }) => {
          const orgTable = config.orgTable(ctx.db),
            orgPk = config.orgPk(orgTable),
            orgMemberTable = config.orgMemberTable(ctx.db),
            orgMemberPk = config.orgMemberPk(orgMemberTable),
            org = orgPk.find(args.orgId)

          if (!org) throw makeError('NOT_FOUND', 'org:transfer_ownership')
          requireRole({
            minRole: 'owner',
            operation: 'transfer_ownership',
            org,
            orgMemberTable,
            sender: ctx.sender,
            tableName: 'org'
          })

          const targetMember = findOrgMember(orgMemberTable, args.orgId, args.newOwnerId as unknown as Identity)
          if (!targetMember) throw makeError('NOT_ORG_MEMBER', 'org:transfer_ownership')
          if (!targetMember.isAdmin) throw makeError('TARGET_MUST_BE_ADMIN', 'org:transfer_ownership')

          orgPk.update({
            ...(org as unknown as Record<string, unknown>),
            updatedAt: ctx.timestamp,
            userId: args.newOwnerId
          } as OrgRow)

          const removed = orgMemberPk.delete(targetMember.id)
          if (!removed) throw makeError('NOT_FOUND', 'org:transfer_ownership')

          orgMemberTable.insert({
            id: 0 as MemberId,
            isAdmin: true,
            orgId: args.orgId,
            updatedAt: ctx.timestamp,
            userId: ctx.sender
          } as MemberRow)
        }
      )

    return {
      exports: {
        org_leave: leaveReducer,
        org_remove_member: removeMemberReducer,
        org_set_admin: setAdminReducer,
        org_transfer_ownership: transferOwnershipReducer
      }
    }
  }

export type {
  OrgMemberReducersConfig,
  OrgMemberReducersExports,
  OrgMemberRowLike,
  OrgMemberTableLike,
  OrgPkLike,
  OrgRowLike
}
export { makeMemberReducers }
