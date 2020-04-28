import React, { Fragment, useState, useMemo, useCallback } from "react";
import { useApolloClient, useMutation } from "@apollo/react-hooks";
import i18next from "i18next";
import { useHistory } from "react-router-dom";
import DataTable, { useDataTable } from "@reactioncommerce/catalyst/DataTable";
import { useSnackbar } from "notistack";
import { makeStyles } from "@material-ui/core";
import useCurrentShopId from "/imports/client/ui/hooks/useCurrentShopId";
import { getAccountAvatar } from "/imports/plugins/core/accounts/client/helpers/helpers";
import accountsQuery from "../graphql/queries/accounts";
import archiveGroups from "../graphql/mutations/archiveGroups";
import updateGroup from "../graphql/mutations/updateGroup";
import cloneGroups from "../graphql/mutations/cloneGroups";
import createGroupMutation from "../graphql/mutations/createGroup";
import GroupSelectorDialog from "./GroupSelectorDialog";
import useGroups from "../hooks/useGroups";

const useStyles = makeStyles((theme) => ({
  card: {
    overflow: "visible"
  },
  cardHeader: {
    paddingBottom: 0
  },
  selectedAccount: {
    fontWeight: 400,
    marginLeft: theme.spacing(1)
  }
}));

/**
 * @summary Main products view
 * @name ProductsTable
 * @returns {React.Component} A React component
 */
function AccountsTable(props) {
  const apolloClient = useApolloClient();
  const { enqueueSnackbar } = useSnackbar();
  const history = useHistory();
  const [shopId] = useCurrentShopId();
  const [createGroup, { error: createProductError }] = useMutation(createGroupMutation);
  const { isLoadingGroups, groups } = useGroups(shopId);

  // React-Table state
  const [isLoading, setIsLoading] = useState(false);
  const [pageCount, setPageCount] = useState(1);
  const [selectedRows, setSelectedRows] = useState([]);
  const [tableData, setTableData] = useState([]);

  // Tag selector state
  const [isGroupSelectorVisible, setGroupSelectorVisibility] = useState(false);

  // Create and memoize the column data
  const columns = useMemo(() => [
    {
      Header: "",
      accessor: (account) => getAccountAvatar(account),
      id: "profilePicture"
    }, {
      Header: i18next.t("admin.accountsTable.header.email"),
      accessor: (row) => {
        const email = row.emailRecords[0].address;

        return email;
      },
      id: "email"
    }, {
      Header: i18next.t("admin.accountsTable.header.name"),
      accessor: "name"
    }
  ], []);

  const onFetchData = useCallback(async ({ pageIndex, pageSize }) => {
    // Wait for shop id to be available before fetching products.
    setIsLoading(true);
    if (!shopId) {
      return;
    }

    const { data } = await apolloClient.query({
      query: accountsQuery,
      variables: {
        groupIds: [props.group._id],
        first: pageSize,
        limit: (pageIndex + 1) * pageSize,
        offset: pageIndex * pageSize
      },
      fetchPolicy: "network-only"
    });

    // Update the state with the fetched data as an array of objects and the calculated page count
    setTableData(data.accounts.nodes);
    setPageCount(Math.ceil(data.accounts.totalCount / pageSize));

    setIsLoading(false);
  }, [apolloClient, shopId, props.group._id]);

  const onRowSelect = useCallback(async ({ selectedRows: rows }) => {
    setSelectedRows(rows || []);
  }, []);

  const dataTableProps = useDataTable({
    columns,
    data: tableData,
    isFilterable: false,
    pageCount,
    onFetchData,
    onRowSelect,
    getRowId: (row) => row._id
  });

  const { refetch } = dataTableProps;

  // Create options for the built-in ActionMenu in the DataTable
  const options = useMemo(() => [{
    label: i18next.t("admin.accountsTable.bulkActions.addRemoveGroupsFromAccount"),
    isDisabled: selectedRows.length === 0,
    onClick: () => {
      setGroupSelectorVisibility(true);
    }
  }], [selectedRows]);

  return (
    <Fragment>
      {selectedRows && !isLoadingGroups &&
        <GroupSelectorDialog
          isOpen={isGroupSelectorVisible}
          onSuccess={() => null}
          onClose={() => setGroupSelectorVisibility(false)}
          accounts={tableData.filter((account) => selectedRows.includes(account._id))}
          groups={groups}
        />
      }
      <DataTable
        {...dataTableProps}
        actionMenuProps={{ options }}
        isLoading={isLoading}
      />
    </Fragment>
  );
}

export default AccountsTable;
